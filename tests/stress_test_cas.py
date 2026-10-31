import os
import sys
import asyncio
from datetime import date

# 将项目根目录加入 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.core.database import init_db, get_db_connection
from server.models.database_init import init_database_tables
from server.services.user_service import create_user
from server.services.credit_service import execute_tool_charge

async def run_stress_test():
    print("==================================================")
    print(">> Start Phase 2a CAS Stress Test (200 Concurrent Requests)")
    print("==================================================")

    # 1. 确保测试数据库就绪
    await init_db()
    await init_database_tables()

    # 2. 创建专用测试用户 (初始 100 点)
    import time
    ts = int(time.time() * 1000)
    test_email = f"stress_test_{ts}@test.com"
    test_user_name = f"tester_{ts}"
    user = await create_user(
        username=test_user_name,
        email=test_email,
        password_raw="test123456",
        role="user",
        initial_credits=100
    )
    user_id = user["id"]
    print(f"[*] Created test user: UID={user_id}, initial_credits=100")

    # 3. 准备收费工具：ai_img_gen (cost=10, daily_free_limit=0 纯付费)
    tool_key = "ai_img_gen"
    print(f"[*] 扣费目标工具: {tool_key} (单次扣 10 点，无免费额度)")

    # 4. 发起 200 个并发扣费请求 (带 503 重试，对齐前端 creditService.js)
    print("[*] Dispatching 200 concurrent charge requests with 503 retry...")
    success_count = 0
    insufficient_count = 0
    other_errors = 0

    async def single_charge_task():
        nonlocal success_count, insufficient_count, other_errors
        retries = 3
        for attempt in range(retries + 1):
            try:
                res = await execute_tool_charge(tool_key, user_id)
                if res["status"] == "charged":
                    success_count += 1
                    return
            except Exception as e:
                err_str = str(e)
                if "503" in err_str or "SYSTEM_BUSY" in err_str:
                    if attempt < retries:
                        await asyncio.sleep(0.05 * (2 ** attempt))
                        continue
                    else:
                        other_errors += 1
                        return
                elif "INSUFFICIENT_CREDITS" in err_str or "402" in err_str:
                    insufficient_count += 1
                    return
                else:
                    other_errors += 1
                    print(f"[!] Unexpected error: {e}")
                    return

    tasks = [single_charge_task() for _ in range(200)]
    await asyncio.gather(*tasks)

    # 5. 验收校验
    print("\n---------------- Test Results ----------------")
    print(f"Success charged (expected strictly 10): {success_count}")
    print(f"Blocked insufficient (expected strictly 190): {insufficient_count}")
    print(f"Other errors (expected 0): {other_errors}")

    db = await get_db_connection()
    try:
        # 查最终余额
        cur = await db.execute("SELECT credit_balance FROM users WHERE id = ?", (user_id,))
        final_balance = (await cur.fetchone())[0]

        # 查扣费流水总数与总扣减额
        tx_cur = await db.execute(
            "SELECT COUNT(*), SUM(amount) FROM credit_transactions WHERE user_id = ? AND type = 'deduct'",
            (user_id,)
        )
        tx_count, tx_total_amount = await tx_cur.fetchone()

        print(f"User final balance (expected strictly 0): {final_balance}")
        print(f"Deduct transaction logs count (expected strictly 10): {tx_count}")
        print(f"Total deducted amount (expected strictly -100): {tx_total_amount}")

        # 断言硬性指标
        assert success_count == 10, f"Success count mismatch: {success_count} != 10"
        assert insufficient_count == 190, f"Insufficient count mismatch: {insufficient_count} != 190"
        assert other_errors == 0, f"Unexpected errors: {other_errors}"
        assert final_balance == 0, f"Final balance mismatch: {final_balance} != 0"
        assert tx_count == 10, f"Transaction log count mismatch: {tx_count} != 10"
        assert tx_total_amount == -100, f"Fund conservation violated: {tx_total_amount} != -100"

        print("\n[SUCCESS] All 200 concurrent CAS charge assertions PASSED! ZERO OVER-CHARGE!")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(run_stress_test())
