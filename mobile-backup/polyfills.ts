// WeakRef polyfill for Hermes on Legacy Architecture (React Native old arch)
// zustand v5 uses WeakRef for subscriptions; Hermes old-arch build doesn't include it.
if (typeof WeakRef === 'undefined') {
  (global as any).WeakRef = class WeakRef<T extends object> {
    private _target: T;
    constructor(target: T) { this._target = target; }
    deref(): T { return this._target; }
  };
}
