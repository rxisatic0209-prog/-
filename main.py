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
    format='%(asctime)s - 🛡️ - %(message)s'
)

def setup_config():
    """终端交互配置，初始化必要的 API KEY"""
    env_path = '.env'
    if not os.path.exists(env_path):
        with open(env_path, 'w') as f: f.write("")

    load_dotenv()

    print("\n" + " 🛡️  智能审计系统 (本地版) ".center(50, "="))

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
            
    print("\n✅ 环境检查完毕。")
    print("=" * 50 + "\n")

def send_mac_notification(title, subtitle):
    """发送 Mac 原生系统通知"""
    if sys.platform == "darwin":
        # 使用 osascript 调用系统 AppleScript 弹窗
        os.system(f"osascript -e 'display notification \"{subtitle}\" with title \"{title}\" sound name \"Crystal\"'")

def main():
    # 1. 引导配置
    setup_config()
    
    try:
        # 2. 初始化工具 (如需登录商城，此处会处理)
        tools_inst = AuditTools()
        # 3. 初始化 AI 审计引擎
        engine = ReActEngine()
        
        # 轮询间隔 (从环境变量读取，默认 30 分钟)
        check_interval = int(os.getenv("CHECK_INTERVAL", "1800"))

        while True:
            current_time = time.strftime('%H:%M:%S')
            print(f"📡 [{current_time}] 正在扫描最新商城订单...")
            
            # 获取最新订单 (基于你 tools.py 中的实现)
            new_orders = tools_inst.get_latest_orders(size=5)

            if not new_orders:
                print("☕ 暂无新订单，系统持续观察中...")
            else:
                print(f"🚨 发现 {len(new_orders)} 笔待审计订单，AI 专家正在分析...")
                
                for order in new_orders:
                    buyer_name = order.get('buyer', '未知用户')
                    gift_name = order.get('giftName', 'N/A')
                    
                    print(f"\n" + "—"*15 + f" 🔍 审计对象：{buyer_name} " + "—"*15)
                    
                    # 4. 执行 AI 审计推理
                    audit_question = tools_inst.format_order_for_audit(order)
                    report = engine.run_audit(audit_question)
                    
                    # 5. 判定结论并执行系统提醒
                    if "[违规]" in report:
                        title, emoji = "🚨 发现违规行为", "🔴"
                        send_mac_notification("审计预警", f"买家 {buyer_name} 判定违规")
                    elif "[高风险]" in report:
                        title, emoji = "⚠️ 风险待观察", "🟡"
                    else:
                        title, emoji = "✅ 审计合规", "🟢"

                    # 6. 终端打印详细报告
                    print(f"状态判定: {emoji} {title}")
                    print(f"买家昵称: {buyer_name}")
                    print(f"兑换物品: {gift_name}")
                    print(f"--- 🤖 详细审计报告 ---")
                    print(report)
                    print("—"*50)

            print(f"💤 巡检完成。{check_interval/60:.1f} 分钟后开始下一轮扫描...")
            time.sleep(check_interval)

    except KeyboardInterrupt:
        print("\n👋 收到停止信号，系统已安全关闭。")
    except Exception as e:
        print(f"\n❌ 运行发生严重错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
