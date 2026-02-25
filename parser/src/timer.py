import asyncio
import functools
import time


def timeit(func):
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"[{func.__name__}] выполнено за {elapsed:.3f}с")
        return result

    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"[{func.__name__}] выполнено за {elapsed:.3f}с")
        return result

    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper
