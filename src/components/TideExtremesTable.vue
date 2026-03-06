<template>
  <div v-if="rows.length" class="tide-events">
    <h3 class="section-title">Tide Extremes</h3>
    <div class="tide-table-container">
      <table class="tide-extremes-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Low</th>
            <th>High</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <td class="period-cell">{{ row.label }}</td>
            <td :class="viewMode === 'anchor' ? row.lowClass : 'extreme-cell-neutral'">{{ row.low }}</td>
            <td :class="viewMode === 'anchor' ? 'high-cell' : 'extreme-cell-neutral'">{{ row.high }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  rows: {
    type: Array,
    required: true,
  },
  viewMode: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
.tide-events {
  margin: 6px 8px 0;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--app-surface-color) 95%, var(--app-text-color) 5%);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--app-text-color);
  margin: 0 0 6px 0;
  padding-left: 8px;
}

.tide-events .section-title {
  padding-left: 0;
  margin: 0 0 10px 0;
}

.tide-table-container {
  overflow-x: auto;
}

.tide-extremes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.tide-extremes-table th {
  text-align: left;
  padding: 8px 6px;
  font-weight: 600;
  color: var(--app-muted-text-color);
  border-bottom: 1px solid var(--app-border-color);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
}

.tide-extremes-table td {
  padding: 10px 6px;
  border-bottom: 1px solid var(--app-border-color);
  vertical-align: top;
}

.tide-extremes-table tr:last-child td {
  border-bottom: none;
}

.period-cell {
  font-weight: 600;
  color: var(--app-text-color);
  white-space: nowrap;
}

.high-cell {
  color: #22c55e;
  font-weight: 500;
}

.low-cell-safe {
  color: #22c55e;
  font-weight: 500;
}

.low-cell-warning {
  color: #f97316;
  font-weight: 500;
}

.low-cell-danger {
  color: #ef4444;
  font-weight: 500;
}

.extreme-cell-neutral {
  color: var(--app-text-color);
  font-weight: 500;
}
</style>
