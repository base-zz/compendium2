import noble from '@abandonware/noble';

noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    noble.startScanning([], true); // Scan for all devices
  } else {
    console.log("Bluetooth is off or unavailable");
  }
});

noble.on('discover', (peripheral) => {
  console.log(`Found: ${peripheral.advertisement.localName || 'Unnamed'}`);
  console.log(`MAC: ${peripheral.address}`);
  console.log(`RSSI: ${peripheral.rssi}`);
});