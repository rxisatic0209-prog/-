import os
import time
import json
import requests
import logging
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

load_dotenv()

class AuditTools:
    def __init__(self):
        self.token = None
        self.order_api = os.getenv("ORDER_API_REAL")
        self.point_api = os.getenv("POINT_API_REAL")
        self.login_url = os.getenv("LOGIN_PAGE_URL")
        self.webhook_url = os.getenv("FEISHU_WEBHOOK")
        self.data_dir = os.path.abspath("./data")
        
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
            
        # 🚀 启动即检查 Token，确保系统一开始就是活的
        self._ensure_token()

    def _ensure_token(self):
        """自动拦截并维护 user-Token"""
        if self.token:
            return self.token
        
        logging.info("🔑 正在检查登录状态...")
        try:
            with sync_playwright() as p:
                context_dir = os.path.join(self.data_dir, "pw_session")
                # headless=False 方便别人在自己电脑上首次运行时扫码
                context = p.chromium.launch_persistent_context(
                    context_dir, 
                    headless=False, 
                    slow_mo=500
                )
                page = context.new_page()
                
                if page.url != self.login_url:
                    page.goto(self.login_url)
                
                # 轮询拦截 Token (最多等 2 分钟)
                for _ in range(60): 
                    cookies = context.cookies()
                    for ck in cookies:
                        if ck['name'] == 'user-Token' and ck['value'] != 'null':
                            self.token = ck['value']
                            logging.info("✅ Token 拦截成功！")
                            break
                    if self.token: break
                    time.sleep(2)
                
                context.close()
        except Exception as e:
            logging.error(f"❌ Playwright 运行异常: {e}")
        return self.token

    def send_to_feishu_bot(self, title, content):
        """
        [机器人对话能力] 将审计结果推送到飞书
        """
        if not self.webhook_url:
            logging.warning("⚠️ 未配置 FEISHU_WEBHOOK，跳过推送。")
            return

        # 构造飞书富文本卡片
        payload = {
            "msg_type": "post",
            "content": {
                "post": {
                    "zh_cn": {
                        "title": title,
                        "content": [
                            [
                                {"tag": "text", "text": content}
                            ]
                        ]
                    }
                }
            }
        }
        try:
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            if response.status_code == 200:
                logging.info("🚀 审计消息已成功推送到飞书机器人")
            else:
                logging.error(f"❌ 飞书推送失败: {response.text}")
        except Exception as e:
            logging.error(f"❌ 飞书连接异常: {e}")

    def format_order_for_audit(self, order_data):
        """将原始订单转换为 AI 审计目标文本"""
        buyer = order_data.get('buyer', '未知')
        return (
            f"--- 待审计订单 ---\n"
            f"买家: {buyer} | 订单号: {order_data.get('id')}\n"
            f"礼品: {order_data.get('giftName')} | 备注: {order_data.get('describe', '无')}\n"
            f"请核查【{buyer}】的流水，判断其是否通过灌水、高频刷分等违规手段获取积分。"
        )

    def get_latest_orders(self, size=10):
        token = self._ensure_token()
        if not token: return []
        headers = {"Authorization": token}
        try:
            resp = requests.get(self.order_api, params={"pageIndex": 1, "pageSize": size}, headers=headers, timeout=10)
            return resp.json().get("data", []) if resp.status_code == 200 else []
        except Exception: return []

    def get_user_points(self, user_input):
        """核心审计工具：获取清洗后的流水"""
        user_name = str(user_input).strip().replace('"', '').replace("'", "")
        token = self._ensure_token()
        if not token: return "Error: Token Missing"

        try:
            headers = {"Authorization": token}
            resp = requests.get(self.point_api, params={"userName": user_name, "pageIndex": 1, "pageSize": 15}, headers=headers)
            raw_list = resp.json().get("data", [])
            if not raw_list: return f"未找到用户 {user_name} 的记录。"

            clean_data = []
            for item in raw_list:
                # 清洗 HTML 标签
                clean_desc = BeautifulSoup(str(item.get("description", "")), "html.parser").get_text(strip=True)
                clean_data.append({
                    "时间": item.get("createdTime"),
                    "事项": item.get("pointItemName"),
                    "金币": item.get("tradePoints"),
                    "描述": clean_desc[:40]
                })
            return json.dumps(clean_data, ensure_ascii=False)
        except Exception as e:
            return f"查询失败: {e}"

def get_tools_map():
    inst = AuditTools()
    return {
        "get_latest_orders": inst.get_latest_orders,
        "get_user_points": inst.get_user_points
    }