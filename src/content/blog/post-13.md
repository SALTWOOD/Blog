---
title: '简单的 OpenBMCLAPI 节点流量统计'
description: ''
pubDate: 2025-02-15T14:19:28.000Z
updatedDate: 2026-03-21T16:14:38.184Z
tags: []
category: ''
---

<p>最近疯开了几个节点，但是一个一个查询流量很麻烦，所以索性写了个简单的玩意统计用户流量。</p>



<p>先把代码贴在这里：</p>



<pre class="wp-block-code"><code>import requests
import math

def to_readable_hits(hits):
units = &#91;'次', '万次', '亿次', '兆次']
pows = math.floor(math.log(hits, 10000))
unit = units&#91;pows]
return f"{hits / (10000 ** pows):.2f}{unit}"

def to_readable_bytes(bytes):
units = &#91;'B', 'KB', 'MB', 'GB', 'TB']
pows = math.floor(math.log(bytes, 1024))
unit = units&#91;pows]
return f"{bytes / (1024 ** pows):.2f} {unit}"

resp = requests.get("https://bd.bangbang93.com/openbmclapi/metric/rank", headers={"Cookie": "openbmclapi-jwt=YOUR_TOKEN_HERE"})

hits = 0
bytes = 0

for i in resp.json():
if i&#91;"user"]&#91;"name"] != "SALTWO∅D":
continue
metric = i&#91;"metric"]
hits += metric&#91;"hits"]
bytes += metric&#91;"bytes"]

print(to_readable_hits(hits))
print(to_readable_bytes(bytes))</code></pre>



<p>写着写着，感觉这玩意可以有更多的玩法，于是又改了改成了这样：</p>



<pre class="wp-block-code"><code>from dataclasses import dataclass
import requests
import math

@dataclass
class User():
hits: int = 0
bytes: int = 0
clusters: int = 0

@dataclass
class Result():
rank: int
name: str
hits: int
bytes: int
clusters: int

def __repr__(self) -> str:
return f""

def to_readable_hits(hits):
units = &#91;'次', '万次', '亿次', '兆次']
pows = math.floor(math.log(hits, 10000)) if hits != 0 else 0
unit = units&#91;pows]
return f"{hits / (10000 ** pows):.2f}{unit}"

def to_readable_bytes(bytes):
units = &#91;'B', 'KB', 'MB', 'GB', 'TB']
pows = math.floor(math.log(bytes, 1024)) if bytes != 0 else 0
unit = units&#91;pows]
return f"{bytes / (1024 ** pows):.2f} {unit}"

if __name__ == '__main__':
resp = requests.get("https://bd.bangbang93.com/openbmclapi/metric/rank", headers={"Cookie": "openbmclapi-jwt=YOUR_TOKEN_HERE"})
users: dict&#91;str, User] = {}

for i in resp.json():
if "metric" not in i: continue

user = i&#91;"user"]&#91;"name"]
entity = users.get(user, None)
entity = entity if entity is not None else User()

metric = i&#91;"metric"]

hits = metric&#91;"hits"]
entity.hits += hits
bytes = metric&#91;"bytes"]
entity.bytes += bytes

if hits != 0 and bytes != 0: entity.clusters += 1

users&#91;user] = entity

entries = list(users.items())
entries.sort(key = lambda item: item&#91;1].bytes, reverse=True)

count = 0
results = &#91;]
for i in entries:
count += 1
results.append(Result(count, i&#91;0], i&#91;1].hits, i&#91;1].bytes, i&#91;1].clusters))
for i in results: print(i)</code></pre>



<p>这样就实现了一个简单的用户节点流量排序。</p>



<p>顺带把执行的输出给一个示例：</p>



<pre class="wp-block-code"><code>1. MoeMelon —— 3615.05万次 20.43 TB
2. muxiaohan —— 3132.53万次 18.32 TB
3. weyeah —— 2401.30万次 14.74 TB
4. ZeroWolf —— 2329.03万次 13.34 TB
5. Huangsam04 —— 1734.03万次 9.35 TB
6. Frkovo —— 1486.50万次 8.41 TB
7. SALTWO∅D —— 1302.18万次 7.48 TB
8. FOXBALL-ONE —— 1145.32万次 6.29 TB
9. 冬烟mio —— 1129.84万次 6.26 TB
10. ApliNi —— 933.48万次 5.39 TB
11. bangbang93 —— 683.83万次 3.38 TB
12. ByLongGe —— 440.29万次 3.24 TB
13. Sora Shion —— 563.33万次 3.23 TB
14. boxdl —— 579.42万次 3.19 TB
15. Mari2233 —— 568.57万次 3.09 TB
16. ghitori —— 547.54万次 3.04 TB
17. 听风 —— 496.70万次 2.83 TB
18. 8Mi_Yile —— 465.09万次 2.54 TB
19. 幽梦琉璃 —— 168.15万次 1.64 TB
20. liuyuhang9066 —— 259.47万次 1.59 TB</code></pre>