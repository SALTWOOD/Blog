---
title: "利用简码实现一个 WordPress 天气小工具"
description: "通过腾讯位置服务与天气 API，用 WordPress 简码实现一个根据访客 IP 显示所在地天气的小工具。"
pubDate: 2025-02-26T13:10:35.000Z
updatedDate: 2026-03-28T12:57:12.173Z
# heroImage: '../../assets/6.webp'
tags: [WordPress, 天气, PHP]
category: ""
---

> [!NOTE]
> 此工具是动态的，而缓存插件可能会把结果缓存，因此使用此工具请不要启用缓存插件，否则可能泄露访客来源信息。

**EDIT:** 已有更完善的 Ajax 版本，不会阻塞页面渲染，能提高网站打开速度。详见此：

https://blog.ski.ink/2025/04/08/newer-weather-widget-with-ajax/

简单来说，就是实现像站点右侧的这个小东西一样的一个天气小工具。

## 1. 准备工作

你需要去[腾讯位置服务](https://lbs.qq.com/dev/console)搞一个开发者账号，认证，然后去 **应用管理**、**我的应用**、**创建应用**，新建一个 Key，类型选 WebServiceAPI。

## 2. 添加小工具

### 2.1. 代码

```php
function get_user_ip()
{
    return $_SERVER['REMOTE_ADDR'];
}
function get_tencent_location($api_key, $ip)
{
    $url = "https://apis.map.qq.com/ws/location/v1/ip?key={$api_key}&ip={$ip}";
    $response = wp_remote_get($url);
    if (is_wp_error($response))
        return false;
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if ($data['status'] === 0 && isset($data['result']['ad_info'])) {
        return [
            'province' => $data['result']['ad_info']['province'],
            'city' => $data['result']['ad_info']['city'],
            'county' => $data['result']['ad_info']['district'],
            'adcode' => $data['result']['ad_info']['adcode']
        ];
    }
    return false;
}
function get_tencent_weather($api_key, $location)
{
    $params = http_build_query([
        'source' => 'pc',
        'weather_type' => 'observe|forecast_1h',
        'province' => $location['province'],
        'city' => $location['city'],
        'county' => $location['county']
    ]);
    $url = "https://wis.qq.com/weather/common?key={$api_key}&{$params}";
    $response = wp_remote_get($url);
    if (is_wp_error($response))
        return false;
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (isset($data['data'])) {
        return [
            'observe' => $data['data']['observe'] ?? [],
            'forecast_1h' => $data['data']['forecast_1h'][0] ?? [],
            'update_time' => $data['data']['observe']['update_time'] ?? ''
        ];
    }
    return false;
}
function current_weather_shortcode()
{
    $api_key = 'YOUR_TENCENT_APPLICATION_KEY'; // 腾讯地图API Key
    $ip = get_user_ip();
    // 30分钟缓存
    $cache_key = 'tencent_weather_' . md5($ip);
    $weather_data = get_transient($cache_key);
    if (false === $weather_data) {
        $location = get_tencent_location($api_key, $ip);
        if (!$location || empty($location['province'])) {
            $default_msg = sprintf('位置服务暂不可用（IP：%s）', esc_html($ip));
            return '<div class="weather-error">' . $default_msg . '</div>';
        }
        $weather = get_tencent_weather($api_key, $location);
        if (!$weather) {
            $error_msg = sprintf('天气服务暂时不可用（%s）', esc_html($location['city']));
            return '<div class="weather-error">' . $error_msg . '</div>';
        }
        // 生成地理位置显示文本
        $location_text = '';
        if (!empty($location['county'])) {
            $location_text = $location['county'];
        } elseif (!empty($location['city'])) {
            $location_text = $location['city'];
        } elseif (!empty($location['province'])) {
            $location_text = $location['province'];
        } else {
            $location_text = '未知地区';
        }
        // 格式化数据
        $weather_data = [
            'city' => $location['city'],
            'degree' => $weather['observe']['degree'] ?? 'N/A',
            'weather' => $weather['observe']['weather'] ?? 'N/A',
            'humidity' => $weather['observe']['humidity'] ?? 'N/A',
            'wind_direction' => $weather['forecast_1h']['wind_direction'] ?? '',
            'wind_speed' => ($weather['forecast_1h']['wind_power'] . '级') ?? '',
            'update' => preg_replace('/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/', '$1年$2月$3日$4:$5', $weather['update_time']),
            'location' => $location_text
        ];
        set_transient($cache_key, $weather_data, 15 * MINUTE_IN_SECONDS);
    }
    // 输出模板
    ob_start(); ?>
    <div class="current-weather">
        <div class="temp"><?= esc_html($weather_data['degree']) ?>℃</div>
        <div class="details">
            <div class="meta">
                <span><strong><?= esc_html($weather_data['location']) ?></strong></span><br>
                <span><strong><?= esc_html($weather_data['weather']) ?></strong></span><br>
                <span>湿度 <strong><?= esc_html($weather_data['humidity']) ?>%</strong></span><br>
                <span><?= esc_html($weather_data['wind_direction']) ?>
                    <strong><?= esc_html($weather_data['wind_speed']) ?></strong></span>
            </div>
        </div>
    </div>
    <style>
        .current-weather {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .temp {
            font-size: 2em;
            font-weight: bold;
            color: #1a73e8;
        }
        .meta {
            font-size: 0.9em;
            text-align: center;
        }
        .weather-error {
            color: #dc3545;
            padding: 10px;
            border: 1px solid #ffeeba;
        }
    </style>
    <?php
    return ob_get_clean();
}
add_shortcode('current_weather', 'current_weather_shortcode');
```

### 2.2. 使用

把申请的 API Key 填到上面对应位置，然后把这段代码放进 **functions.php**。

我使用的是 **WPCode**，所以把这两个东西丢进 **Snippets** 就好了。

## 3. 实际效果

![](https://static.ski.ink/blog-uploads/6/images/1.webp)

这就是实际效果。因为本人能力所限，就只能做到这个视觉效果了。
如果读者有更好的方案，或者修改出一个更好的版本，欢迎在评论区留下您的作品。
