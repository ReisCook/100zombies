// src/physics/Collider.js
import { Vector3, Box3, Sphere, Raycaster } from 'three';

/**
 * Base Collider class
 */
export class Collider {
    constructor(position) {
        this.position = position ? position.clone() : new Vector3();
    }
    
    /**
     * Update collider position
     * @param {Vector3} position - New position
     */
    updatePosition(position) {
        this.position.copy(position);
    }
    
    /**
     * Check if this collider intersects with another
     * @param {Collider} other - Other collider to check against
     * @returns {boolean} - True if colliders intersect
     */
    intersects(other) {
        console.warn('Base Collider.intersects() called - should be overridden by subclass');
        return false;
    }
    
    /**
     * Get collision info between this collider and another
     * @param {Collider} other - Other collider to check against
     * @returns {Object|null} - Collision info or null if no collision
     */
    getCollisionInfo(other) {
        console.warn('Base Collider.getCollisionInfo() called - should be overridden by subclass');
        return null;
    }
}

/**
 * Sphere collider
 */
export class SphereCollider extends Collider {
    /**
     * Create a new sphere collider
     * @param {Vector3} position - Center position
     * @param {number} radius - Sphere radius
     */
    constructor(position, radius) {
        super(position);
        this.radius = radius;
        this.sphere = new Sphere(this.position, this.radius);
    }
    
    /**
     * Update collider position
     * @param {Vector3} position - New position
     */
    updatePosition(position) {
        super.updatePosition(position);
        this.sphere.center.copy(this.position);
    }
    
    /**
     * Check if this sphere intersects with another collider
     * @param {Collider} other - Other collider to check against
     * @returns {boolean} - True if colliders intersect
     */
    intersects(other) {
        if (other instanceof SphereCollider) {
            return this.sphere.intersectsSphere(other.sphere);
        }
        
        if (other instanceof BoxCollider) {
            return other.box.intersectsSphere(this.sphere);
        }
        
        return false;
    }
    
    /**
     * Get collision info between this sphere and another collider
     * @param {Collider} other - Other collider
     * @returns {Object|null} - Collision info or null if no collision
     */
    getCollisionInfo(other) {
        if (other instanceof SphereCollider) {
            // Sphere vs sphere collision
            const distance = this.position.distanceTo(other.position);
            const minDistance = this.radius + other.radius;
            
            if (distance < minDistance) {
                // Calculate collision normal
                const normal = new Vector3()
                    .subVectors(this.position, other.position)
                    .normalize();
                
                // Calculate penetration depth
                const depth = minDistance - distance;
                
                // Calculate contact point
                const contactPoint = new Vector3()
                    .copy(normal)
                    .multiplyScalar(this.radius)
                    .add(this.position);
                
                return {
                    normal,
                    depth,
                    point: contactPoint
                };
            }
        }
        
        if (other instanceof BoxCollider) {
            // Sphere vs box collision - use box's method for this
            return other.getCollisionInfo(this);
        }
        
        return null;
    }
}

/**
 * Box collider
 */
export class BoxCollider extends Collider {
    /**
     * Create a new box collider
     * @param {Vector3} position - Center position
     * @param {Vector3} halfExtents - Half sizes in each dimension
     */
    constructor(position, halfExtents) {
        super(position);
        this.halfExtents = halfExtents.clone();
        this.updateBox();
    }
    
    /**
     * Update internal Box3 representation
     */
    updateBox() {
        const min = new Vector3()
            .copy(this.position)
            .sub(this.halfExtents);
            
        const max = new Vector3()
            .copy(this.position)
            .add(this.halfExtents);
            
        this.box = new Box3(min, max);
    }
    
    /**
     * Update collider position
     * @param {Vector3} position - New position
     */
    updatePosition(position) {
        super.updatePosition(position);
        this.updateBox();
    }
    
    /**
     * Check if this box intersects with another collider
     * @param {Collider} other - Other collider to check against
     * @returns {boolean} - True if colliders intersect
     */
    intersects(other) {
        if (other instanceof BoxCollider) {
            return this.box.intersectsBox(other.box);
        }
        
        if (other instanceof SphereCollider) {
            return this.box.intersectsSphere(other.sphere);
        }
        
        return false;
    }
    
    /**
     * Get collision info between this box and another collider
     * @param {Collider} other - Other collider
     * @returns {Object|null} - Collision info or null if no collision
     */
    getCollisionInfo(other) {
        if (other instanceof BoxCollider) {
            // Box vs box collision
            if (!this.intersects(other)) {
                return null;
            }
            
            // Find minimum penetration axis
            const axes = [
                new Vector3(1, 0, 0),
                new Vector3(0, 1, 0),
                new Vector3(0, 0, 1)
            ];
            
            let minDepth = Infinity;
            let minAxis = axes[0];
            
            for (const axis of axes) {
                // Project boxes onto axis
                const proj1 = this.projectOntoAxis(axis);
                const proj2 = other.projectOntoAxis(axis);
                
                // Calculate overlap
                const overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
                
                if (overlap <= 0) {
                    return null; // No collision
                }
                
                if (overlap < minDepth) {
                    minDepth = overlap;
                    minAxis = axis;
                    
                    // Ensure normal points from this to other
                    const centerDelta = new Vector3()
                        .subVectors(other.position, this.position);
                        
                    if (centerDelta.dot(axis) < 0) {
                        minAxis.multiplyScalar(-1);
                    }
                }
            }
            
            // Calculate contact point (approximate)
            const contactPoint = new Vector3()
                .copy(this.position)
                .add(other.position)
                .multiplyScalar(0.5);
                
            return {
                normal: minAxis,
                depth: minDepth,
                point: contactPoint
            };
        }
        
        if (other instanceof SphereCollider) {
            // Box vs sphere collision
            if (!this.intersects(other)) {
                return null;
            }
            
            // Find closest point on box to sphere center
            const closestPoint = other.position.clone().clamp(
                this.box.min, 
                this.box.max
            );
            
            const distance = closestPoint.distanceTo(other.position);
            
            // If sphere is not penetrating, no collision
            if (distance > other.radius) {
                return null;
            }
            
            // Calculate normal direction
            const normal = new Vector3()
                .subVectors(other.position, closestPoint)
                .normalize();
                
            // Calculate penetration depth
            const depth = other.radius - distance;
            
            return {
                normal,
                depth,
                point: closestPoint
            };
        }
        
        return null;
    }
    
    /**
     * Project this box onto an axis
     * @param {Vector3} axis - Axis to project onto
     * @returns {Object} - Projection min and max values
     */
    projectOntoAxis(axis) {
        // Calculate projection of box center
        const center = this.position.dot(axis);
        
        // Calculate projection of half-extents
        const radius = Math.abs(this.halfExtents.x * axis.x) +
                      Math.abs(this.halfExtents.y * axis.y) +
                      Math.abs(this.halfExtents.z * axis.z);
                      
        return {
            min: center - radius,
            max: center + radius
        };
    }
}