---
title: '通过 Ajax 实现一个更强的天气小工具'
description: ''
pubDate: 2025-04-08T12:00:33.000Z
updatedDate: 2026-03-21T16:14:38.184Z
tags: []
category: ''
---

<h2 class="wp-block-heading">0. 起因</h2>



<p>阅读过我之前写的一篇文章的朋友都知道，当时我通过 WordPress 简码实现了一个天气小工具。</p>



<figure class="wp-block-embed is-type-wp-embed"><div class="wp-block-embed__wrapper">
https://blog.ski.ink/2025/02/26/simple-weather-widget/
</div></figure>



<p>但是这个天气小工具在实际使用时会出现很多问题。由于我这边的网络请求腾讯的 API 比较慢，因此 WordPress 在加载页面时会先请求腾讯 API，然后阻塞在那里，导致网站打开速度慢很多。</p>



<p>后面知道了一个东西叫 Ajax，这个东西可以很方便地动态请求数据。而 WordPress 原生支持 Ajax，这意味着我不需要再额外搭建一个服务器来提供请求服务。于是在 AI 以及各种文档的帮助下，我写出了前文天气小工具的增强版。</p>



<h2 class="wp-block-heading">1. 代码</h2>



<p>与之前的版本相同，只需要把这段代码放进 <code>functions.php</code> 或者 <strong>WPCode</strong> 中，然后通过简码 <code>[noshortcode][current_weather][/noshortcode]</code> 调用即可。与之前的版本不同的是，它会通过 Ajax 在前端向 WordPress 发出请求，这样就不会阻塞页面的加载。</p>



<pre class="wp-block-code"><code>&lt;?php
add_action('init', 'init');
function init()
{
    wp_enqueue_script(
        'weather',
        '',
        &#91;'jquery']
    );
    add_shortcode('current_weather', 'current_weather_shortcode');
    add_action('wp_ajax_get_weather_data', 'get_weather_data');
    add_action('wp_ajax_nopriv_get_weather_data', 'get_weather_data');
}

function get_user_ip()
{
    return $_SERVER&#91;'REMOTE_ADDR'] ?? '127.0.0.1';
}

function get_tencent_location($api_key, $ip)
{
    $url = "https://apis.map.qq.com/ws/location/v1/ip?key={$api_key}&amp;ip={$ip}";

    $response = wp_remote_get($url, &#91;
        'timeout' => 8
    ]);

    if (is_wp_error($response))
        return false;

    $data = json_decode(wp_remote_retrieve_body($response), true) ?: &#91;];

    if (($data&#91;'status'] ?? 1) === 0 &amp;&amp; isset($data&#91;'result']&#91;'ad_info'])) {
        $adinfo = $data&#91;'result']&#91;'ad_info'] ?? &#91;];
        return &#91;
            'province' => $adinfo&#91;'province'] ?? '',
            'city' => $adinfo&#91;'city'] ?? '',
            'county' => $adinfo&#91;'district'] ?? '',
            'adcode' => $adinfo&#91;'adcode'] ?? ''
        ];
    }

    return false;
}

function get_tencent_weather($api_key, $location)
{
    $params = http_build_query(&#91;
        'source' => 'pc',
        'weather_type' => 'observe|forecast_1h',
        'province' => $location&#91;'province'] ?? '',
        'city' => $location&#91;'city'] ?? '',
        'county' => $location&#91;'county'] ?? ''
    ]);

    $url = "https://wis.qq.com/weather/common?key={$api_key}&amp;{$params}";

    $response = wp_remote_get($url, &#91;
        'timeout' => 8
    ]);

    if (is_wp_error($response))
        return false;

    $data = json_decode(wp_remote_retrieve_body($response), true) ?: &#91;];

    $observe = $data&#91;'data']&#91;'observe'] ?? &#91;];
    $forecast = $data&#91;'data']&#91;'forecast_1h'] ?? &#91;];

    return &#91;
        'observe' => $observe,
        'forecast_1h' => $forecast&#91;0] ?? &#91;],
        'update_time' => $observe&#91;'update_time'] ?? ''
    ];
}

function current_weather_shortcode()
{
    // 输出模板
    ob_start(); ?>
    &lt;div>
        &lt;div class="weather-loader">加载中...&lt;/div>
        &lt;div class="current-weather" style="display: none;">
            &lt;div class="temp">&lt;/div>
            &lt;div class="details">
                &lt;div class="meta">
                    &lt;span>&lt;strong class="location">&lt;/strong>&lt;/span>&lt;br>
                    &lt;span>&lt;strong class="weather">&lt;/strong>&lt;/span>&lt;br>
                    &lt;span>湿度 &lt;strong class="humidity">&lt;/strong>%&lt;/span>&lt;br>
                    &lt;span class="wind-direction">&lt;/span>
                    &lt;strong class="wind-speed">&lt;/strong>
                &lt;/div>
            &lt;/div>
        &lt;/div>
        &lt;div class="weather-error" style="display: none;">&lt;/div>
    &lt;/div>

    &lt;script>
        window.weatherParams = {
            ajaxUrl: "&lt;?php echo admin_url('admin-ajax.php'); ?>",
            nonce: "&lt;?php echo wp_create_nonce('get_weather_data'); ?>"
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
    &lt;/script>

    &lt;style>
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
    &lt;/style>
    &lt;?php
    return ob_get_clean();
}

function get_weather_data()
{
    check_ajax_referer('get_weather_data', 'security');

    $api_key = '<strong>YOUR_TENCENT_APPLICATION_KEY</strong>';
    $ip = get_user_ip();

    $cache_key = 'tencent_weather_' . md5($ip);
    $weather_data = get_transient($cache_key);
    $cache_hit = true;

    if (false === $weather_data) {
        $cache_hit = false;
        $location = get_tencent_location($api_key, $ip);

        if (!$location || empty(trim($location&#91;'province'] . $location&#91;'city']))) {
            wp_send_json_error(&#91;
                'error' => sprintf('位置服务暂不可用（IP：%s）', esc_html($ip))
            ]);
            return;
        }

        $weather = get_tencent_weather($api_key, $location);

        if (!$weather || empty($weather&#91;'observe'])) {
            wp_send_json_error(&#91;'error' => '天气服务暂时不可用']);
            return;
        }

        $location_text = trim(
            $location&#91;'county'] ??
            $location&#91;'city'] ??
            $location&#91;'province'] ??
            '未知地区'
        );

        $forecast_1h = $weather&#91;'forecast_1h'] ?? &#91;];
        $update_time = $weather&#91;'update_time'] ?? '';

        $weather_data = &#91;
            'city' => $location&#91;'city'] ?? '',
            'degree' => $weather&#91;'observe']&#91;'degree'] ?? 'N/A',
            'weather' => $weather&#91;'observe']&#91;'weather'] ?? '未知',
            'humidity' => $weather&#91;'observe']&#91;'humidity'] ?? '--',
            'wind_direction' => $forecast_1h&#91;'wind_direction'] ?? '',
            'wind_speed' => isset($forecast_1h&#91;'wind_power']) ? ($forecast_1h&#91;'wind_power'] . '级') : '',
            'update' => $update_time ? preg_replace(
                '/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/',
                '$1年$2月$3日$4:$5',
                $update_time
            ) : '时间未知',
            'location' => $location_text
        ];

        set_transient($cache_key, $weather_data, 15 * MINUTE_IN_SECONDS);
    }

    $weather_data&#91;'cache_hit'] = $cache_hit;
    wp_send_json_success($weather_data);
}
?></code></pre>