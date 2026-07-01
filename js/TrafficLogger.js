/**
 * Shadowrocket 流量记录并上传服务器脚本
 * * 核心原理：
 * 1. 通过 Shadowrocket 配置中的 `argument` 动态接收你的个人服务器 API 地址。
 * 2. 自动判断当前是 http-request 还是 http-response 阶段。
 * 3. 提取数据（Header、Body、URL 等）组装为 JSON 格式。
 * 4. 异步静默发送到你的服务器，不影响正常上网体验。
 */

// 1. 获取动态传入的参数 (格式为 URL|||Token)
const args = typeof $argument !== "undefined" ? $argument : "";
const [serverUrl, authToken] = args.split('|||');

// 发通知，测试用。
$notification.post("主标题", "副标题", `通知内容 serverUrl: ${serverUrl}    authToken: ${authToken}`);

if (!serverUrl) {
    console.log("❌ 错误: 未配置目标服务器 URL 参数");
    $done({});
}

// 2. 防护机制：如果拦截的请求本身就是发给日志服务器的，直接放行
if ($request.url.includes(serverUrl)) {
    console.log("❌ 错误: 拦截到自身放行");
    $done({});
}

// 3. 判断阶段并提取数据
const isResponse = typeof $response !== "undefined";
let payload = {
    timestamp: new Date().toISOString(),
    type: isResponse ? "response" : "request",
    url: $request.url,
    method: $request.method
};

if (isResponse) {
    payload.status = $response.status;
    payload.headers = $response.headers;
    payload.body = $response.body || "";
} else {
    payload.headers = $request.headers;
    payload.body = $request.body || "";
}

// 4. 构造发送请求
const options = {
    url: serverUrl,
    headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shadowrocket-Logger/1.1"
    },
    body: JSON.stringify(payload)
};

// 5. 加入鉴权 Token
if (authToken) {
    options.headers["Authorization"] = `Bearer ${authToken}`;
}

// 6. 异步发送并放行
$httpClient.post(options, function(error, response, data) {
    if (error) {
        console.log(serverUrl + "   " + authToken + "⚠️ 日志上传失败: " + error);
    } else {
        console.log(`✅ 上传成功 (${response.status}) URL:  ${serverUrl}   ${authToken} `);
    }
});

$done({});
