# API Reference

<script setup>
import { data } from './symbols.data'
</script>

<p>{{ data.total }} types, generated at build time from the published <code>metadata.json</code>.</p>

<template v-for="g in data.groups" :key="g.module">
  <h2 :id="g.module">{{ g.module }}</h2>
  <ul>
    <li v-for="s in g.items" :key="s.slug">
      <a :href="`/api/symbols/${s.slug}`">{{ s.name }}</a>
      &nbsp;<Badge type="info" :text="s.kind" />
    </li>
  </ul>
</template>
