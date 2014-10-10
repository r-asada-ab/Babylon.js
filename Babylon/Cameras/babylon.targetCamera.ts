﻿module BABYLON {
    export class TargetCamera extends Camera {

        public cameraDirection = new BABYLON.Vector3(0, 0, 0);
        public cameraRotation = new BABYLON.Vector2(0, 0);
        public rotation = new BABYLON.Vector3(0, 0, 0);

        public speed = 2.0;
        public noRotationConstraint = false;
        public lockedTarget = null;

        public _currentTarget = BABYLON.Vector3.Zero();
        public _viewMatrix = BABYLON.Matrix.Zero();
        public _camMatrix = BABYLON.Matrix.Zero();
        public _cameraTransformMatrix = BABYLON.Matrix.Zero();
        public _cameraRotationMatrix = BABYLON.Matrix.Zero();
        public _referencePoint = new BABYLON.Vector3(0, 0, 1);
        public _transformedReferencePoint = BABYLON.Vector3.Zero();
        public _lookAtTemp = BABYLON.Matrix.Zero();
        public _tempMatrix = BABYLON.Matrix.Zero();

        public _reset:() => void;

        constructor(name:string, position:Vector3, scene:Scene) {
            super(name, position, scene);
        }

        public _getLockedTargetPosition():Vector3 {
            if (!this.lockedTarget) {
                return null;
            }

            return this.lockedTarget.position || this.lockedTarget;
        }

        // Cache
        public _initCache() {
            super._initCache();
            this._cache.lockedTarget = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            this._cache.rotation = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        }

        public _updateCache(ignoreParentClass?:boolean):void {
            if (!ignoreParentClass) {
                super._updateCache();
            }

            var lockedTargetPosition = this._getLockedTargetPosition();
            if (!lockedTargetPosition) {
                this._cache.lockedTarget = null;
            }
            else {
                if (!this._cache.lockedTarget) {
                    this._cache.lockedTarget = lockedTargetPosition.clone();
                }
                else {
                    this._cache.lockedTarget.copyFrom(lockedTargetPosition);
                }
            }

            this._cache.rotation.copyFrom(this.rotation);
        }

        // Synchronized
        public _isSynchronizedViewMatrix():boolean {
            if (!super._isSynchronizedViewMatrix()) {
                return false;
            }

            var lockedTargetPosition = this._getLockedTargetPosition();

            return (this._cache.lockedTarget ? this._cache.lockedTarget.equals(lockedTargetPosition) : !lockedTargetPosition)
                && this._cache.rotation.equals(this.rotation);
        }

        // Methods
        public _computeLocalCameraSpeed():number {
            return this.speed * ((BABYLON.Tools.GetDeltaTime() / (BABYLON.Tools.GetFps() * 10.0)));
        }

        // Target
        public setTarget(target:Vector3):void {
            this.upVector.normalize();

            BABYLON.Matrix.LookAtLHToRef(this.position, target, this.upVector, this._camMatrix);
            this._camMatrix.invert();

            this.rotation.x = Math.atan(this._camMatrix.m[6] / this._camMatrix.m[10]);

            var vDir = target.subtract(this.position);

            if (vDir.x >= 0.0) {
                this.rotation.y = (-Math.atan(vDir.z / vDir.x) + Math.PI / 2.0);
            } else {
                this.rotation.y = (-Math.atan(vDir.z / vDir.x) - Math.PI / 2.0);
            }

            this.rotation.z = -Math.acos(BABYLON.Vector3.Dot(new BABYLON.Vector3(0, 1.0, 0), this.upVector));

            if (isNaN(this.rotation.x)) {
                this.rotation.x = 0;
            }

            if (isNaN(this.rotation.y)) {
                this.rotation.y = 0;
            }

            if (isNaN(this.rotation.z)) {
                this.rotation.z = 0;
            }
        }

        public getTarget():Vector3 {
            return this._currentTarget;
        }


        public _decideIfNeedsToMove():boolean {
            return Math.abs(this.cameraDirection.x) > 0 || Math.abs(this.cameraDirection.y) > 0 || Math.abs(this.cameraDirection.z) > 0;
        }

        public _updatePosition():void{
            this.position.addInPlace(this.cameraDirection);
        }
        public _update():void {
            var needToMove = this._decideIfNeedsToMove();
            var needToRotate = Math.abs(this.cameraRotation.x) > 0 || Math.abs(this.cameraRotation.y) > 0;

            // Move
            if (needToMove) {
                this._updatePosition();
            }

            // Rotate
            if (needToRotate) {
                this.rotation.x += this.cameraRotation.x;
                this.rotation.y += this.cameraRotation.y;


                if (!this.noRotationConstraint) {
                    var limit = (Math.PI / 2) * 0.95;


                    if (this.rotation.x > limit)
                        this.rotation.x = limit;
                    if (this.rotation.x < -limit)
                        this.rotation.x = -limit;
                }
            }

            // Inertia
            if (needToMove) {
                if (Math.abs(this.cameraDirection.x) < BABYLON.Engine.Epsilon) {
                    this.cameraDirection.x = 0;
                }

                if (Math.abs(this.cameraDirection.y) < BABYLON.Engine.Epsilon) {
                    this.cameraDirection.y = 0;
                }

                if (Math.abs(this.cameraDirection.z) < BABYLON.Engine.Epsilon) {
                    this.cameraDirection.z = 0;
                }

                this.cameraDirection.scaleInPlace(this.inertia);
            }
            if (needToRotate) {
                if (Math.abs(this.cameraRotation.x) < BABYLON.Engine.Epsilon) {
                    this.cameraRotation.x = 0;
                }

                if (Math.abs(this.cameraRotation.y) < BABYLON.Engine.Epsilon) {
                    this.cameraRotation.y = 0;
                }
                this.cameraRotation.scaleInPlace(this.inertia);
            }
        }


        public _getViewMatrix():Matrix {
            if (!this.lockedTarget) {
                // Compute
                if (this.upVector.x != 0 || this.upVector.y != 1.0 || this.upVector.z != 0) {
                    BABYLON.Matrix.LookAtLHToRef(BABYLON.Vector3.Zero(), this._referencePoint, this.upVector, this._lookAtTemp);
                    BABYLON.Matrix.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, this.rotation.z, this._cameraRotationMatrix);


                    this._lookAtTemp.multiplyToRef(this._cameraRotationMatrix, this._tempMatrix);
                    this._lookAtTemp.invert();
                    this._tempMatrix.multiplyToRef(this._lookAtTemp, this._cameraRotationMatrix);
                } else {
                    BABYLON.Matrix.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, this.rotation.z, this._cameraRotationMatrix);
                }

                BABYLON.Vector3.TransformCoordinatesToRef(this._referencePoint, this._cameraRotationMatrix, this._transformedReferencePoint);

                // Computing target and final matrix
                this.position.addToRef(this._transformedReferencePoint, this._currentTarget);
            } else {
                this._currentTarget.copyFrom(this._getLockedTargetPosition());
            }

            BABYLON.Matrix.LookAtLHToRef(this.position, this._currentTarget, this.upVector, this._viewMatrix);
            return this._viewMatrix;
        }
    }
} 