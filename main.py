import time
import logging
import os
import sys
from dotenv import load_dotenv, set_key
from tools import AuditTools
from ReActEngine import ReActEngine

# 配置日志：更加直观的对话式输出
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - 🤖 - %(message)s'
)

def setup_config():
    """终端交互配置，取代 GUI 弹窗"""
    env_path = '.env'
    if not os.path.exists(env_path):
        with open(env_path, 'w') as f: f.write("")

    load_dotenv()

    print("\n" + " 🛡️  XREAL 智能审计系统配置 ".center(50, "="))

    # 1. 检查 API KEY
    if not os.getenv("LLM_API_KEY"):
        print("\n🔑 检测到未配置 LLM API KEY")
        api_key = input("👉 请输入您的 API KEY: ").strip()
        if api_key:
            set_key(env_path, "LLM_API_KEY", api_key)
            os.environ["LLM_API_KEY"] = api_key
        else:
            print("❌ 错误：必须提供 API KEY 才能运行。")
            sys.exit(1)

    # 2. 检查 Webhook
    if not os.getenv("FEISHU_WEBHOOK"):
        print("\n📢 检测到未配置飞书机器人 Webhook")
        webhook = input("👉 请输入 Webhook 地址 (留空则仅在本地运行): ").strip()
        if webhook:
            set_key(env_path, "FEISHU_WEBHOOK", webhook)
            os.environ["FEISHU_WEBHOOK"] = webhook

    print("\n✅ 配置完成！即将启动浏览器，请完成扫码登录。")
    print("=" * 50 + "\n")

def send_mac_notification(title, subtitle):
    """发送 Mac 原生系统通知"""
    # 只有在 Mac 系统下才尝试发送
    if sys.platform == "darwin":
        os.system(f"osascript -e 'display notification \"{subtitle}\" with title \"{title}\" sound name \"Crystal\"'")

def main():
    # 1. 终端配置引导
    setup_config()
    
    try:
        # 2. 初始化工具 (会弹出浏览器供登录)
        tools_inst = AuditTools()
        # 3. 初始化 AI 引擎
        engine = ReActEngine()
        
        # 轮询间隔 (从环境变量读取，默认 30 分钟)
        check_interval = int(os.getenv("CHECK_INTERVAL", "1800"))

        while True:
            current_time = time.strftime('%H:%M:%S')
            print(f"📡 [{current_time}] 系统：正在扫描商城最新订单...")
            
            # 获取最新订单
            new_orders = tools_inst.get_latest_orders(size=5)

            if not new_orders:
                print("☕ 系统：暂无新订单，持续监控中...")
            else:
                print(f"🚨 系统：发现 {len(new_orders)} 笔新订单，审计专家正在介入...")
                
                for order in new_orders:
                    buyer_name = order.get('buyer', '未知用户')
                    gift_name = order.get('giftName', 'N/A')
                    
                    print(f"\n" + "—"*15 + f" 🔍 正在审计：{buyer_name} " + "—"*15)
                    
                    # AI 推理
                    audit_question = tools_inst.format_order_for_audit(order)
                    report = engine.run_audit(audit_question)
                    
                    # 判定结论
                    if "[违规]" in report:
                        title, emoji = "🚨 发现积分违规行为", "🔴"
                        send_mac_notification("违规预警", f"买家 {buyer_name} 判定违规")
                    elif "[高风险]" in report:
                        title, emoji = "⚠️ 风险待观察", "🟡"
                    else:
                        title, emoji = "✅ 审计合规", "🟢"

                    # 构造推送内容
                    bot_msg = (
                        f"判定状态: {emoji} {title}\n"
                        f"买家昵称: {buyer_name}\n"
                        f"订单详情: {gift_name}\n"
                        f"------------------------------\n"
                        f"🤖 AI 审计结论：\n{report}"
                    )
                    
                    # 推送至飞书
                    tools_inst.send_to_feishu_bot(title, bot_msg)
                    
                    # 控制台反馈
                    print(f"结论：{title}")
                    print("—"*50)

            print(f"💤 本轮巡检结束，{check_interval/60:.1f} 分钟后进行下一次扫描...")
            time.sleep(check_interval)

    except KeyboardInterrupt:
        print("\n👋 收到停止信号，机器人已安全线下。")
    except Exception as e:
        print(f"\n❌ 系统运行发生严重错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()