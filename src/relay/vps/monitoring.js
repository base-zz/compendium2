export function getConnectionStats(activeConnections, proxy) {
  return {
    total: activeConnections?.size || 0,
    byVessel: Array.from(activeConnections?.values() || []).reduce((acc, conn) => {
      if (conn?.vesselId) {
        acc[conn.vesselId] = (acc[conn.vesselId] || 0) + 1;
      }
      return acc;
    }, {}),
    proxyStats: proxy?.getStats?.() || { error: "proxy_unavailable" },
    timestamp: new Date().toISOString()
  };
}
