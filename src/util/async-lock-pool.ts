interface AsyncLock {
	data: any,
	free: () => void,
}

type ConfirmableAsyncLock = AsyncLock & {
	confirm: (value: () => void | PromiseLike<() => void>) => void,
};

/**
* Release a lock. If there are acquire requests waiting in the queue, shift
*   one off and pass it to user.
* @param {AsyncLockPool} k_self - self instance
* @param {AsyncLock} g_lock - lock object to be released
* @return {void}
*/
function AsyncLockPool$_release(k_self: AsyncLockPool, g_lock: AsyncLock): () => void {
	return () => {
		// remove self from locks
		k_self._a_locks.splice(k_self._a_locks.indexOf(g_lock), 1);

		// free
		k_self._c_free += 1;

		queueMicrotask(() => {
			// at least one promise waiting for lock
			if(k_self._a_awaits.length) {
				let g_lock_await = k_self._a_awaits.shift() as ConfirmableAsyncLock;

				g_lock_await.confirm(g_lock_await.free);
			}
		});
	};
}

/**
* This data structure allows checking out virtual 'locks' for multiple concurrent
*   uses of a single/shared/limited resource such as network I/O.
*/
export class AsyncLockPool {
	_c_free: number;
	_a_awaits: ConfirmableAsyncLock[] = [];
	_a_locks: AsyncLock[] = [];


	/**
	* Create a new AsyncLockPool
	* @param {number} n_locks - number of locks to allocate for this pool
	*/
	constructor(n_locks: number) {
		this._c_free = n_locks;
	}

	/**
	* Acquire a lock. If one is free in the pool it will return immediately,
	*   otherwise it will be queued to receive lock when one becomes avail.
	* @param {any} w_data - data to associate with this lock
	* @return {Promise<Release>} - resolves with function to call when user
	*   is ready to release this lock
	*/
	acquire(w_data=null): Promise<() => void> {
		// at least one free lock
		if(this._c_free > 0) {
			// consume a lock
			this._c_free -= 1;

			// create lock object
			let g_lock: AsyncLock = {
				data: w_data,
			} as AsyncLock;

			// assign self-referential free function
			g_lock.free = AsyncLockPool$_release(this, g_lock);

			// push to open
			this._a_locks.push(g_lock);

			// done
			return Promise.resolve(g_lock.free);
		}
		else {
			return new Promise((fk_acquire) => {
				let g_lock = {
					confirm: fk_acquire,
					data: w_data,
				} as ConfirmableAsyncLock;

				g_lock.free = AsyncLockPool$_release(this, g_lock);

				this._a_awaits.push(g_lock);
			});
		}
	}
}

export default AsyncLockPool;
