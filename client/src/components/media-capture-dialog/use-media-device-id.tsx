import { useState } from 'react'

export function useMediaDeviceId(devices: MediaDeviceInfo[]) {
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.deviceId ?? '')

  if (devices.length > 0 && !selectedDeviceId) {
    setSelectedDeviceId(devices[0].deviceId)
  }

  return [selectedDeviceId, setSelectedDeviceId] as const
}
