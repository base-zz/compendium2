import asyncio
from bleak import BleakScanner, BleakClient

# UUIDs from your Arduino sketch
SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

async def main():
    print("🔍 Scanning for AnchorBuoy BLE device...")
    devices = await BleakScanner.discover(timeout=5.0)

    target_device = None
    for d in devices:
        if "AnchorBuoy" in (d.name or ""):
            target_device = d
            break

    if not target_device:
        print("❌ AnchorBuoy not found. Make sure it's powered on and advertising.")
        return

    print(f"✅ Found AnchorBuoy: {target_device.name} ({target_device.address})")

    async with BleakClient(target_device.address) as client:
        print("🔗 Connected to device.")
        
        # Define a callback to handle notifications
        def notification_handler(sender, data):
            try:
                decoded = data.decode("utf-8")
            except UnicodeDecodeError:
                decoded = str(data)
            print(f"📡 Received from {sender}: {decoded}")

        # Subscribe to notifications
        await client.start_notify(CHARACTERISTIC_UUID, notification_handler)
        print("📬 Listening for GPS updates (Ctrl+C to quit)...")

        # Keep running until interrupted
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping notifications...")
            await client.stop_notify(CHARACTERISTIC_UUID)

if __name__ == "__main__":
    asyncio.run(main())

