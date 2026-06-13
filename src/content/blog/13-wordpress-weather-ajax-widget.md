---
title: '通过 Ajax 实现一个更强的天气小工具'
description: ''
pubDate: 2025-04-08T12:00:33.000Z
updatedDate: 2026-03-21T16:14:38.184Z
tags: [WordPress, 天气, Ajax]
category: ''
---

## 0. 起因

阅读过我之前写的一篇文章的朋友都知道，当时我通过 WordPress 简码实现了一个天气小工具。

https://blog.ski.ink/2025/02/26/simple-weather-widget/

但是这个天气小工具在实际使用时会出现很多问题。由于我这边的网络请求腾讯的 API 比较慢，因此 WordPress 在加载页面时会先请求腾讯 API，然后阻塞在那里，导致网站打开速度慢很多。

后面知道了一个东西叫 Ajax，这个东西可以很方便地动态请求数据。而 WordPress 原生支持 Ajax，这意味着我不需要再额外搭建一个服务器来提供请求服务。于是在 AI 以及各种文档的帮助下，我写出了前文天气小工具的增强版。

## 1. 代码

与之前的版本相同，只需要把这段代码放进 `functions.php` 或者 **WPCode** 中，然后通过简码 `[noshortcode][current_weather][/noshortcode]` 调用即可。与之前的版本不同的是，它会通过 Ajax 在前端向 WordPress 发出请求，这样就不会阻塞页面的加载。

```php
<?php

add_action('init', 'init');

function init()

{

    wp_enqueue_script(

        'weather',

        '',

        ['jquery']

    );

    add_shortcode('current_weather', 'current_weather_shortcode');

    add_action('wp_ajax_get_weather_data', 'get_weather_data');

    add_action('wp_ajax_nopriv_get_weather_data', 'get_weather_data');

}



function get_user_ip()

{

    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

}



function get_tencent_location($api_key, $ip)

{

    $url = "https://apis.map.qq.com/ws/location/v1/ip?key={$api_key}&ip={$ip}";



    $response = wp_remote_get($url, [

        'timeout' => 8

    ]);



    if (is_wp_error($response))

        return false;



    $data = json_decode(wp_remote_retrieve_body($response), true) ?: [];



    if (($data['status'] ?? 1) === 0 && isset($data['result']['ad_info'])) {

        $adinfo = $data['result']['ad_info'] ?? [];

        return [

            'province' => $adinfo['province'] ?? '',

            'city' => $adinfo['city'] ?? '',

            'county' => $adinfo['district'] ?? '',

            'adcode' => $adinfo['adcode'] ?? ''

        ];

    }



    return false;

}



function get_tencent_weather($api_key, $location)

{

    $params = http_build_query([

        'source' => 'pc',

        'weather_type' => 'observe|forecast_1h',

        'province' => $location['province'] ?? '',

        'city' => $location['city'] ?? '',

        'county' => $location['county'] ?? ''

    ]);



    $url = "https://wis.qq.com/weather/common?key={$api_key}&{$params}";



    $response = wp_remote_get($url, [

        'timeout' => 8

    ]);



    if (is_wp_error($response))

        return false;



    $data = json_decode(wp_remote_retrieve_body($response), true) ?: [];



    $observe = $data['data']['observe'] ?? [];

    $forecast = $data['data']['forecast_1h'] ?? [];



    return [

        'observe' => $observe,

        'forecast_1h' => $forecast[0] ?? [],

        'update_time' => $observe['update_time'] ?? ''

    ];

}



function current_weather_shortcode()

{

    // 输出模板

    ob_start(); ?>

    <div>

        <div class="weather-loader">加载中...</div>

        <div class="current-weather" style="display: none;">

            <div class="temp"></div>

            <div class="details">

                <div class="meta">

                    <span><strong class="location"></strong></span><br>

                    <span><strong class="weather"></strong></span><br>

                    <span>湿度 <strong class="humidity"></strong>%</span><br>

                    <span class="wind-direction"></span>

                    <strong class="wind-speed"></strong>

                </div>

            </div>

        </div>

        <div class="weather-error" style="display: none;"></div>

    </div>



    <script>

        window.weatherParams = {

            ajaxUrl: "<?php echo admin_url('admin-ajax.php'); ?>",

            nonce: "<?php echo wp_create_nonce('get_weather_data'); ?>"

        };

        (function ($) {

            $(document).ready(function () {

                window.requestWeather = function (callback) {

                    $.ajax({

                        url: window.weatherParams.ajaxUrl,

                        type: 'POST',

                        data: {

                            action: 'get_weather_data',

                            security: window.weatherParams.nonce

                        },

                        beforeSend: function () {

                            $('.weather-loader').show();

                            $('.current-weather').hide();

                            $('.weather-error').hide();

                        },

                        success: function (response) {

                            $('.weather-loader').hide();



                            if (response.success) {

                                const data = response.data;



                                $('.weather-error').hide();



                                $('.temp').text(data.degree + '℃');

                                $('.location').text(data.location);

                                $('.weather').text(data.weather);

                                $('.humidity').text(data.humidity);

                                $('.wind-direction').text(data.wind_direction);

                                $('.wind-speed').text(data.wind_speed);

                                $('.current-weather').show();



                                if (typeof callback === 'function') callback(data);

                            } else {

                                $('.weather-loader').hide();

                                $('.current-weather').hide();

                                $('.weather-error').text(response.data.error).show();

                            }

                        },

                        error: function () {

                            $('.weather-loader').hide();

                            $('.current-weather').hide();

                            $('.weather-error').text('请求天气信息失败').show();

                        }

                    });

                };

                if (localStorage.getItem('ui.functions.weather') === null) localStorage.setItem('ui.functions.weather', '1');

                if (localStorage.getItem('ui.functions.weather') === '1') {

                    requestWeather();

                }

                else {

                    jQuery('.weather-loader').hide();

                    jQuery('.current-weather').hide();

                    jQuery('.weather-error').text('根据您的隐私设置，已禁用天气功能。');

                    jQuery('.weather-error').show();

                }

            });

        })(jQuery);

    </script>



    <style>

        .current-weather {

            display: flex;

            align-items: center;

            gap: 25px;

            padding-left: 5px;

        }



        .temp {

            font-size: 2em;

            font-weight: bold;

            color: #1a73e8;

        }



        html.darkmode .temp {

            color: #fba414;

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



        .weather-loader {

            color: #666;

            animation: pulse 1.5s infinite;

        }



        @keyframes pulse {

            0% {

                opacity: 1;

            }



            50% {

                opacity: 0.5;

            }



            100% {

                opacity: 1;

            }

        }

    </style>



    <?php

    return ob_get_clean();

}



function get_weather_data()

{

    check_ajax_referer('get_weather_data', 'security');



    $api_key = 'YOUR_TENCENT_APPLICATION_KEY';

    $ip = get_user_ip();



    $cache_key = 'tencent_weather_' . md5($ip);

    $weather_data = get_transient($cache_key);

    $cache_hit = true;



    if (false === $weather_data) {

        $cache_hit = false;

        $location = get_tencent_location($api_key, $ip);



        if (!$location || empty(trim($location['province'] . $location['city']))) {

            wp_send_json_error([

                'error' => sprintf('位置服务暂不可用（IP：%s）', esc_html($ip))

            ]);

            return;

        }



        $weather = get_tencent_weather($api_key, $location);



        if (!$weather || empty($weather['observe'])) {

            wp_send_json_error(['error' => '天气服务暂时不可用']);

            return;

        }



        $location_text = trim(

            $location['county'] ??

            $location['city'] ??

            $location['province'] ??

            '未知地区'

        );



        $forecast_1h = $weather['forecast_1h'] ?? [];

        $update_time = $weather['update_time'] ?? '';



        $weather_data = [

            'city' => $location['city'] ?? '',

            'degree' => $weather['observe']['degree'] ?? 'N/A',

            'weather' => $weather['observe']['weather'] ?? '未知',

            'humidity' => $weather['observe']['humidity'] ?? '--',

            'wind_direction' => $forecast_1h['wind_direction'] ?? '',

            'wind_speed' => isset($forecast_1h['wind_power']) ? ($forecast_1h['wind_power'] . '级') : '',

            'update' => $update_time ? preg_replace(

                '/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/',

                '$1年$2月$3日$4:$5',

                $update_time

            ) : '时间未知',

            'location' => $location_text

        ];



        set_transient($cache_key, $weather_data, 15 * MINUTE_IN_SECONDS);

    }



    $weather_data['cache_hit'] = $cache_hit;

    wp_send_json_success($weather_data);

}

?>
```
