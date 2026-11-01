import math

result = []
start_lng = 116.397428
start_lat = 39.90923

for i in range(7200):
    lng = start_lng + i * 0.0001 + math.sin(i * 0.01) * 0.001
    lat = start_lat + i * 0.00005 + math.cos(i * 0.01) * 0.0005
    result.append(f'{lng:.6f},{lat:.6f}')

filepath = r'E:\08.AI\xuanheng\test_track_7200points.txt'
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(';'.join(result))