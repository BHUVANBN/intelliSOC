import socket
import os
import random
from network_utils import setup_ip_aliases, get_random_ip

# Setup 50 aliases (100-149)
setup_ip_aliases(50)

target = ("172.25.0.20", 8000)
src_ip = get_random_ip()

print(f"Connecting to {target} from {src_ip}...")

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind((src_ip, 0))
s.connect(target)
print("Connected successfully!")
s.close()
