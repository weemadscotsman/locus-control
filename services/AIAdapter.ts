import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig } from "../types";

// --- TYPES & INTERFACES ---

export interface VisionResult {
    rotateX: number;
    rotateY: number;
    scaleX: number;
    scaleY: number;
    message: string;
}

export interface AIProviderStatus {
    provider: string;
    isAvailable: boolean;
    lastError?: string;
    rateLimitRemaining?: number;
}

interface IAIProvider {
    analyzeImage(prompt: string, imageBase64: string, config: AIConfig): Promise<string>;
    checkAvailability(config: AIConfig): Promise<boolean>;
}

interface CacheEntry {
    result: VisionResult;
    timestamp: number;
    hash: string;
}

// --- UTILITIES ---

const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(resource, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(id);
    }
};

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        if (retries === 0) throw err;
        
        // Don't retry auth errors or quota limits
        if (err?.status === 401 || err?.status === 403 || 
            err?.message?.includes('API key') || err?.message?.includes('quota')) {
            throw err;
        }
        
        // Don't retry on client errors (4xx)
        if (err?.status >= 400 && err?.status < 500 && err?.status !== 429) {
            throw err;
        }
        
        console.warn(`[AI Adapter] Transient Error, retrying in ${delay}ms...`, err);
        await new Promise(res => setTimeout(res, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
    }
}

// Simple hash function for image caching
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// --- PROVIDER IMPLEMENTATIONS ---

class GeminiProvider implements IAIProvider {
    private clients: Map<string, GoogleGenAI> = new Map();
    private lastRateLimitReset = Date.now();
    private requestsThisMinute = 0;
    private readonly MAX_REQUESTS_PER_MINUTE = 60;

    private getClient(apiKey: string): GoogleGenAI {
        if (!this.clients.has(apiKey)) {
            this.clients.set(apiKey, new GoogleGenAI({ apiKey }));
        }
        return this.clients.get(apiKey)!;
    }

    async checkAvailability(config: AIConfig): Promise<boolean> {
        if (!config.geminiKey) return false;
        
        // Check rate limit
        if (Date.now() - this.lastRateLimitReset > 60000) {
            this.requestsThisMinute = 0;
            this.lastRateLimitReset = Date.now();
        }
        
        return this.requestsThisMinute < this.MAX_REQUESTS_PER_MINUTE;
    }

    async analyzeImage(prompt: string, imageBase64: string, config: AIConfig): Promise<string> {
        if (!config.geminiKey) {
            throw new Error("Gemini API Key not configured");
        }

        // Rate limit check
        if (this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE) {
            throw new Error("Rate limit exceeded. Please wait a minute.");
        }

        const ai = this.getClient(config.geminiKey);
        
        try {
            this.requestsThisMinute++;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            rotateX: { type: Type.NUMBER },
                            rotateY: { type: Type.NUMBER },
                            scaleX: { type: Type.NUMBER },
                            scaleY: { type: Type.NUMBER },
                            message: { type: Type.STRING }
                        },
                        propertyOrdering: ["rotateX", "rotateY", "scaleX", "scaleY", "message"]
                    }
                }
            });
            
            return response.text || "{}";
        } catch (error: any) {
            // Enhance error message
            if (error.message?.includes('API key')) {
                throw new Error("Invalid Gemini API key. Please check your configuration.");
            }
            if (error.status === 429) {
                throw new Error("Gemini API quota exceeded. Please try again later.");
            }
            throw error;
        }
    }
}

class OpenAICompatibleProvider implements IAIProvider {
    private endpoint: string;
    private isOllama: boolean;
    private lastHealthCheck: Map<string, number> = new Map();
    
    constructor(isOllama = false) {
        this.isOllama = isOllama;
        this.endpoint = isOllama ? '' : 'https://api.openai.com/v1/chat/completions';
    }

    async checkAvailability(config: AIConfig): Promise<boolean> {
        const cacheKey = this.isOllama ? config.ollamaUrl : 'openai';
        const lastCheck = this.lastHealthCheck.get(cacheKey);
        
        // Cache health check for 30 seconds
        if (lastCheck && Date.now() - lastCheck < 30000) {
            return true;
        }

        if (this.isOllama) {
            try {
                const response = await fetchWithTimeout(`${config.ollamaUrl}/api/tags`, {}, 5000);
                const available = response.ok;
                if (available) this.lastHealthCheck.set(cacheKey, Date.now());
                return available;
            } catch {
                return false;
            }
        }
        
        // For OpenAI, just check if key exists
        return !!config.openaiKey;
    }

    async analyzeImage(prompt: string, imageBase64: string, config: AIConfig): Promise<string> {
        const url = this.isOllama ? `${config.ollamaUrl}/api/chat` : this.endpoint;
        const key = this.isOllama ? 'ollama' : config.openaiKey;
        const model = this.isOllama ? config.ollamaVisionModel : (config.openaiModel || 'gpt-4o');

        if (!this.isOllama && !key) {
            throw new Error("OpenAI API Key not configured");
        }

        if (this.isOllama && !config.ollamaUrl) {
            throw new Error("Ollama URL not configured");
        }

        const messages = [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt + " Respond with JSON only." },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`
                        }
                    }
                ]
            }
        ];

        const payload: any = {
            model: model,
            messages: messages,
            stream: false,
            max_tokens: 500
        };

        if (this.isOllama) {
            payload.format = "json";
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        
        if (!this.isOllama) {
            headers['Authorization'] = `Bearer ${key}`;
        }

        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        }, this.isOllama ? 30000 : 15000);

        if (!response.ok) {
            const err = await response.text();
            if (response.status === 401) {
                throw new Error(`${this.isOllama ? 'Ollama' : 'OpenAI'} authentication failed`);
            }
            if (response.status === 429) {
                throw new Error(`${this.isOllama ? 'Ollama' : 'OpenAI'} rate limit exceeded`);
            }
            throw new Error(`Provider Error ${response.status}: ${err}`);
        }

        const data = await response.json();
        
        if (this.isOllama) {
            return data.message?.content || "{}";
        }
        return data.choices?.[0]?.message?.content || "{}";
    }
}

// --- ADAPTER LAYER (FACADE) ---

export class AIAdapter {
    private providers: { [key: string]: IAIProvider } = {};
    private cache: Map<string, CacheEntry> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_CACHE_SIZE = 50;

    constructor() {
        this.providers['gemini'] = new GeminiProvider();
        this.providers['openai'] = new OpenAICompatibleProvider(false);
        this.providers['ollama'] = new OpenAICompatibleProvider(true);
        this.providers['deepseek'] = new OpenAICompatibleProvider(false);
    }

    /**
     * Check provider availability before making requests
     */
    async checkProvider(config: AIConfig): Promise<AIProviderStatus> {
        const provider = this.providers[config.provider];
        if (!provider) {
            return { provider: config.provider, isAvailable: false, lastError: 'Provider not found' };
        }

        try {
            const isAvailable = await provider.checkAvailability(config);
            return { provider: config.provider, isAvailable };
        } catch (error: any) {
            return { 
                provider: config.provider, 
                isAvailable: false, 
                lastError: error.message 
            };
        }
    }

    /**
     * Domain Logic: Analyze a projection surface for keystone/perspective correction.
     * Now with caching and better error handling.
     */
    public async analyzeProjectionSurface(
        imageBase64: string, 
        surfaceId: number, 
        config: AIConfig
    ): Promise<VisionResult> {
        
        // Check cache first
        const cacheKey = `${config.provider}:${surfaceId}:${hashString(imageBase64.substring(0, 1000))}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            console.log('[AIAdapter] Cache hit for surface', surfaceId);
            return cached.result;
        }

        // DeepSeek doesn't support vision
        if (config.provider === 'deepseek') {
            return {
                rotateX: 0, rotateY: 0, scaleX: 100, scaleY: 100,
                message: "[DEEPSEEK] VISION NOT SUPPORTED. SWITCH PROVIDER."
            };
        }

        // Check provider availability first
        const status = await this.checkProvider(config);
        if (!status.isAvailable) {
            return {
                rotateX: 0, rotateY: 0, scaleX: 100, scaleY: 100,
                message: `AI SERVICE UNAVAILABLE: ${status.lastError || 'Provider not ready'}`
            };
        }

        const prompt = `
            Analyze this projection surface labeled "WALL ${surfaceId}".
            Estimate perspective distortion correction.
            Return JSON with keys: rotateX (-80 to 80), rotateY (-80 to 80), scaleX (10-300), scaleY (10-300), message (string).
            No markdown.
        `;

        try {
            const result = await retryWithBackoff(async () => {
                const provider = this.providers[config.provider] || this.providers['gemini'];
                const rawResponse = await provider.analyzeImage(prompt, imageBase64, config);
                return this.parseResponse(rawResponse);
            }, 2); // Reduced retries for faster feedback

            // Cache successful result
            this.setCache(cacheKey, result);
            return result;

        } catch (error: any) {
            console.error("[AI Adapter] Analysis Failed:", error);
            
            // Provide helpful error messages
            if (error.message?.includes('API key')) {
                return {
                    rotateX: 0, rotateY: 0, scaleX: 100, scaleY: 100,
                    message: "API KEY ERROR: Check your configuration"
                };
            }
            
            if (error.message?.includes('quota') || error.message?.includes('429')) {
                return {
                    rotateX: 0, rotateY: 0, scaleX: 100, scaleY: 100,
                    message: "QUOTA EXCEEDED: Try again later or switch provider"
                };
            }

            if (error.message?.includes('network') || error.name === 'TypeError') {
                return {
                    rotateX: 0, rotateY: 0, scaleX: 100, scaleY: 100,
                    message: "NETWORK ERROR: Check your connection"
                };
            }

            return {
                rotateX: 0, rotateY: 0, scaleX: 100, scaleY: 100,
                message: `AI ERROR: ${error.message?.substring(0, 40)}...`
            };
        }
    }

    /**
     * Clear the analysis cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache stats
     */
    getCacheStats(): { size: number; maxSize: number; ttl: number } {
        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            ttl: this.CACHE_TTL
        };
    }

    private setCache(key: string, result: VisionResult): void {
        // LRU eviction
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const oldest = this.cache.keys().next().value;
            this.cache.delete(oldest);
        }

        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            hash: key
        });
    }

    private parseResponse(text: string): VisionResult {
        try {
            let clean = text.trim();
            
            // Remove markdown code blocks
            if (clean.startsWith('```json')) {
                clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (clean.startsWith('```')) {
                clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Try to extract JSON if embedded in text
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                clean = jsonMatch[0];
            }
            
            const json = JSON.parse(clean);
            
            // Validate and sanitize values
            return {
                rotateX: this.clamp(Number(json.rotateX) || 0, -80, 80),
                rotateY: this.clamp(Number(json.rotateY) || 0, -80, 80),
                scaleX: this.clamp(Number(json.scaleX) || 100, 10, 300),
                scaleY: this.clamp(Number(json.scaleY) || 100, 10, 300),
                message: String(json.message || "SCAN COMPLETE").substring(0, 100)
            };
        } catch (e) {
            console.warn("[AIAdapter] JSON Parse Fail, raw:", text);
            throw new Error("Invalid JSON response from model");
        }
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }
}

export const aiLayer = new AIAdapter();
