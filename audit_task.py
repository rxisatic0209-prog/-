import time
import logging
import os
import sys
import requests
from dotenv import load_dotenv, set_key
from tools import AuditTools
from ReActEngine import ReActEngine

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - 🤖 - %(message)s'
)

def setup_config():
    """配置引导"""
    env_path = '.env'
    if not os.path.exists(env_path):
        with open(env_path, 'w') as f: f.write("")
    load_dotenv()

    print("\n" + " 🛡️  XREAL 智能审计系统配置 ".center(50, "="))
    # 1. 检查 API KEY
    if not os.getenv("LLM_API_KEY"):
        api_key = input("👉 请输入您的 LLM API KEY: ").strip()
        if api_key:
            set_key(env_path, "LLM_API_KEY", api_key)
            os.environ["LLM_API_KEY"] = api_key
    # 2. 检查 Webhook (使用你之前给的那个)
    if not os.getenv("FEISHU_WEBHOOK"):
        webhook = "https://open.feishu.cn/open-apis/bot/v2/hook/cfef4fea-5a54-4c60-a59c-7172a1b76d71"
        set_key(env_path, "FEISHU_WEBHOOK", webhook)
        os.environ["FEISHU_WEBHOOK"] = webhook

    print("\n✅ 配置已就绪，准备启动。")
    print("=" * 50 + "\n")

def send_feishu_webhook(title, content):
    """发送 Webhook 消息"""
    webhook_url = os.getenv("FEISHU_WEBHOOK")
    if not webhook_url: return
    
    payload = {
        "msg_type": "text",
        "content": {
            "text": f"【{title}】\n{content}"
        }
    }
    try:
        requests.post(webhook_url, json=payload)
    except Exception as e:
        print(f"❌ Webhook 发送失败: {e}")

def main():
    setup_config()
    
    try:
        # 初始化工具和引擎
        tools_inst = AuditTools()
        engine = ReActEngine()
        
        # 轮询间隔 (默认 30 分钟)
        check_interval = int(os.getenv("CHECK_INTERVAL", "1800"))

        while True:
            current_time = time.strftime('%H:%M:%S')
            print(f"📡 [{current_time}] 系统：正在扫描商城最新订单...")
            
            # 1. 获取最新订单 (对应 tools.py 里的新方法)
            new_orders = tools_inst.get_latest_orders(size=5)

            if not new_orders:
                print("☕ 系统：暂无新订单，持续监控中...")
            else:
                print(f"🚨 系统：发现 {len(new_orders)} 笔新订单，审计专家正在介入...")
                
                for order in new_orders:
                    buyer_name = order.get('buyer', '未知用户')
                    gift_name = order.get('giftName', 'N/A')
                    
                    print(f"\n" + "—"*15 + f" 🔍 正在审计：{buyer_name} " + "—"*15)
                    
                    # 2. 调用 tools 格式化审计请求
                    audit_question = tools_inst.format_order_for_audit(order)
                    
                    # 3. AI 引擎开始推理
                    report = engine.run_audit(audit_question)
                    
                    # 4. 判定结论
                    if "违规" in report:
                        title, emoji = "🚨 发现积分违规行为", "🔴"
                    elif "异常" in report or "风险" in report:
                        title, emoji = "⚠️ 风险待观察", "🟡"
                    else:
                        title, emoji = "✅ 审计合规", "🟢"

                    # 5. 构造并发送结果
                    bot_msg = (
                        f"判定结论: {emoji} {title}\n"
                        f"买家昵称: {buyer_name}\n"
                        f"兑换礼品: {gift_name}\n"
                        f"------------------------------\n"
                        f"🤖 AI 审计报告：\n{report}"
                    )
                    
                    send_feishu_webhook(title, bot_msg)
                    print(f"✅ 已推送至飞书群")

            print(f"💤 本轮巡检结束，{check_interval/60:.1f} 分钟后进行扫描...")
            time.sleep(check_interval)

    except KeyboardInterrupt:
        print("\n👋 收到停止信号，监控已关闭。")
    except Exception as e:
        print(f"\n❌ 系统出错: {e}")

if __name__ == "__main__":
    main()