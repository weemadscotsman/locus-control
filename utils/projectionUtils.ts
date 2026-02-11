
/**
 * Utility for calculating CSS Matrix3D for Projection Mapping.
 * Simplified Homography for 3D CSS transforms.
 */

export interface Point { x: number; y: number; }

export const generateTestPattern = (width: number, height: number, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    const step = 50;
    
    for(let x=0; x<=width; x+=step) {
        ctx.beginPath();
        ctx.moveTo(x,0); ctx.lineTo(x,height);
        ctx.stroke();
    }
    for(let y=0; y<=height; y+=step) {
        ctx.beginPath();
        ctx.moveTo(0,y); ctx.lineTo(width,y);
        ctx.stroke();
    }
    
    // Crosshair
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width/2, 0); ctx.lineTo(width/2, height);
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.stroke();
    
    // Circles
    ctx.strokeStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(width/2, height/2, height/3, 0, Math.PI*2);
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`${width}x${height}`, 20, 30);
};

// Helper to construct CSS transform string from params
export const getCssTransform = (settings: any) => {
    return `translate3d(${settings.positionX}px, ${settings.positionY}px, 0) ` +
           `rotateX(${settings.rotateX}deg) ` +
           `rotateY(${settings.rotateY}deg) ` +
           `scale3d(${settings.scaleX}, ${settings.scaleY}, 1) ` +
           `perspective(${settings.perspective}px)`;
};
