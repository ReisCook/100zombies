// src/engine/Input.js
export class Input {
    constructor() {
        // Key state
        this.keys = new Map();
        this.keyDownHandlers = new Map();
        this.keyUpHandlers = new Map();
        
        // Mouse state
        this.mousePosition = { x: 0, y: 0 };
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseButtons = new Map();
        this.mouseMoveHandlers = [];
        this.mouseDownHandlers = new Map();
        this.mouseUpHandlers = new Map();
        
        // Touch state
        this.touchState = [];
        this.touchStartHandlers = [];
        this.touchMoveHandlers = [];
        this.touchEndHandlers = [];
        
        // Pointer lock variables
        this.isPointerLocked = false;
        this.pointerLockElement = null;
        this.wasPointerLockedBefore = false;
        
        // Bind event handlers
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchMove = this.handleTouchMove.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
        this.boundHandlePointerLockChange = this.handlePointerLockChange.bind(this);
        this.boundHandlePointerLockError = this.handlePointerLockError.bind(this);
    }
    
    init() {
        // Set up keyboard event listeners
        window.addEventListener('keydown', this.boundHandleKeyDown);
        window.addEventListener('keyup', this.boundHandleKeyUp);
        
        // Set up mouse event listeners
        window.addEventListener('mousemove', this.boundHandleMouseMove);
        window.addEventListener('mousedown', this.boundHandleMouseDown);
        window.addEventListener('mouseup', this.boundHandleMouseUp);
        
        // Set up touch event listeners
        window.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
        window.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
        window.addEventListener('touchend', this.boundHandleTouchEnd);
        
        // Set up pointer lock event listeners
        document.addEventListener('pointerlockchange', this.boundHandlePointerLockChange);
        document.addEventListener('pointerlockerror', this.boundHandlePointerLockError);
        
        // Set the pointer lock element
        this.pointerLockElement = document.getElementById('game-container') || document.body;
        
        // Add click listener to lock pointer
        this.pointerLockElement.addEventListener('click', this.requestPointerLock.bind(this));
        
        console.log('Input system initialized');
    }
    
    handleKeyDown(event) {
        this.keys.set(event.code, true);
        
        // Call registered handlers
        const handlers = this.keyDownHandlers.get(event.code);
        if (handlers) {
            for (const handler of handlers) {
                handler(event);
            }
        }
    }
    
    handleKeyUp(event) {
        this.keys.set(event.code, false);
        
        // Call registered handlers
        const handlers = this.keyUpHandlers.get(event.code);
        if (handlers) {
            for (const handler of handlers) {
                handler(event);
            }
        }
    }
    
    handleMouseMove(event) {
        // Update mouse position
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
        
        // Calculate delta only when pointer is locked
        if (this.isPointerLocked) {
            // Get movement from pointer lock API
            this.mouseDelta.x = event.movementX || 0;
            this.mouseDelta.y = event.movementY || 0;
            
            // Call registered handlers
            for (const handler of this.mouseMoveHandlers) {
                handler(this.mouseDelta.x, this.mouseDelta.y, event);
            }
        }
    }
    
    handleMouseDown(event) {
        this.mouseButtons.set(event.button, true);
        
        // If not locked, request pointer lock on game container
        if (!this.isPointerLocked) {
            this.requestPointerLock();
        }
        
        // Call registered handlers
        const handlers = this.mouseDownHandlers.get(event.button);
        if (handlers) {
            for (const handler of handlers) {
                handler(event);
            }
        }
    }
    
    handleMouseUp(event) {
        this.mouseButtons.set(event.button, false);
        
        // Call registered handlers
        const handlers = this.mouseUpHandlers.get(event.button);
        if (handlers) {
            for (const handler of handlers) {
                handler(event);
            }
        }
    }
    
    handleTouchStart(event) {
        event.preventDefault();
        
        // Update touch state
        for (const touch of event.changedTouches) {
            this.touchState.push({
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY
            });
        }
        
        // Call registered handlers
        for (const handler of this.touchStartHandlers) {
            handler(event);
        }
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        
        // Update touch state
        for (const touch of event.changedTouches) {
            const touchInfo = this.touchState.find(t => t.id === touch.identifier);
            if (touchInfo) {
                touchInfo.currentX = touch.clientX;
                touchInfo.currentY = touch.clientY;
            }
        }
        
        // Call registered handlers
        for (const handler of this.touchMoveHandlers) {
            handler(event);
        }
    }
    
    handleTouchEnd(event) {
        // Update touch state
        this.touchState = this.touchState.filter(touch => {
            for (const changedTouch of event.changedTouches) {
                if (touch.id === changedTouch.identifier) {
                    return false;
                }
            }
            return true;
        });
        
        // Call registered handlers
        for (const handler of this.touchEndHandlers) {
            handler(event);
        }
    }
    
    handlePointerLockChange() {
        // Update pointer lock state
        this.isPointerLocked = document.pointerLockElement === this.pointerLockElement;
        
        if (this.isPointerLocked) {
            console.log("Pointer is now locked");
            // Hide cursor while locked
            document.body.style.cursor = 'none';
        } else {
            console.log("Pointer is now unlocked");
            // Show cursor when unlocked
            document.body.style.cursor = 'auto';
            
            // If the game is running and previously was locked, auto re-lock on click
            this.wasPointerLockedBefore = true;
        }
    }
    
    handlePointerLockError(event) {
        console.error("Error locking pointer:", event);
    }
    
    requestPointerLock() {
        // Request pointer lock on the element
        if (!this.isPointerLocked && this.pointerLockElement.requestPointerLock) {
            this.pointerLockElement.requestPointerLock();
        }
    }
    
    exitPointerLock() {
        if (this.isPointerLocked && document.exitPointerLock) {
            document.exitPointerLock();
        }
    }
    
    isKeyDown(keyCode) {
        return this.keys.get(keyCode) === true;
    }
    
    isMouseButtonDown(button) {
        return this.mouseButtons.get(button) === true;
    }
    
    onKeyDown(keyCode, handler) {
        if (!this.keyDownHandlers.has(keyCode)) {
            this.keyDownHandlers.set(keyCode, []);
        }
        this.keyDownHandlers.get(keyCode).push(handler);
    }
    
    onKeyUp(keyCode, handler) {
        if (!this.keyUpHandlers.has(keyCode)) {
            this.keyUpHandlers.set(keyCode, []);
        }
        this.keyUpHandlers.get(keyCode).push(handler);
    }
    
    onMouseMove(handler) {
        this.mouseMoveHandlers.push(handler);
    }
    
    onMouseDown(button, handler) {
        if (!this.mouseDownHandlers.has(button)) {
            this.mouseDownHandlers.set(button, []);
        }
        this.mouseDownHandlers.get(button).push(handler);
    }
    
    onMouseUp(button, handler) {
        if (!this.mouseUpHandlers.has(button)) {
            this.mouseUpHandlers.set(button, []);
        }
        this.mouseUpHandlers.get(button).push(handler);
    }
    
    onTouchStart(handler) {
        this.touchStartHandlers.push(handler);
    }
    
    onTouchMove(handler) {
        this.touchMoveHandlers.push(handler);
    }
    
    onTouchEnd(handler) {
        this.touchEndHandlers.push(handler);
    }
    
    update() {
        // Reset mouse delta each frame
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }
    
    cleanup() {
        // Remove all event listeners
        window.removeEventListener('keydown', this.boundHandleKeyDown);
        window.removeEventListener('keyup', this.boundHandleKeyUp);
        window.removeEventListener('mousemove', this.boundHandleMouseMove);
        window.removeEventListener('mousedown', this.boundHandleMouseDown);
        window.removeEventListener('mouseup', this.boundHandleMouseUp);
        window.removeEventListener('touchstart', this.boundHandleTouchStart);
        window.removeEventListener('touchmove', this.boundHandleTouchMove);
        window.removeEventListener('touchend', this.boundHandleTouchEnd);
        document.removeEventListener('pointerlockchange', this.boundHandlePointerLockChange);
        document.removeEventListener('pointerlockerror', this.boundHandlePointerLockError);
        
        // Clear all handlers
        this.keyDownHandlers.clear();
        this.keyUpHandlers.clear();
        this.mouseMoveHandlers = [];
        this.mouseDownHandlers.clear();
        this.mouseUpHandlers.clear();
        this.touchStartHandlers = [];
        this.touchMoveHandlers = [];
        this.touchEndHandlers = [];
    }
}