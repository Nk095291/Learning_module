import time
from functools import wraps


def time_it(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()

        result = func(*args, **kwargs)

        end = time.perf_counter()

        print(f"{func.__name__} took {(end - start) * 1000:.2f} ms")

        return result

    return wrapper


def get_bytes(value):
    if isinstance(value, bool):
        # bool is a subclass of int in Python,
        # so check it before int.
        return 1

    if isinstance(value, int):
        # Assume integer -> 4 bytes
        return 4

    if isinstance(value, float):
        # Assume float -> 8 bytes
        return 8

    if isinstance(value, str):
        # Assume each character -> 1 byte
        return len(value)

    if isinstance(value, list):
        return sum(get_bytes(item) for item in value)

    if value is None:
        return 0

    return 0


@time_it
def calculate_storage(values):
    return sum(get_bytes(value) for value in values)


data = [
    10,          # integer -> 4 bytes
    10.5,        # float   -> 8 bytes
    "A",         # char    -> 1 byte
    "Hello",     # string  -> 5 bytes
    True,        # boolean -> 1 byte
    [1, 2, 3],   # list    -> 12 bytes
]

total_bytes = calculate_storage(data)

print(f"Total storage: {total_bytes} bytes")