<template>
  <div class="password-reset-container">
    <h2>Password Reset</h2>
    <form v-if="!token" @submit.prevent="handleReset">
      <div>
        <label for="email">Enter your email address</label>
        <input id="email" v-model="email" type="email" required />
      </div>
      <button type="submit" :disabled="loading">Send Reset Link</button>
      <div v-if="message" class="success">{{ message }}</div>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
    <form v-else @submit.prevent="handleSetPassword">
      <div>
        <label for="password">Enter your new password</label>
        <input id="password" v-model="password" type="password" required minlength="8" />
      </div>
      <button type="submit" :disabled="loading">Set New Password</button>
      <div v-if="message" class="success">{{ message }}</div>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const email = ref('');
const password = ref('');
const loading = ref(false);
const message = ref('');
const error = ref('');
const token = ref('');

const API_BASE_URL = import.meta.env.VITE_VPS_API_URL || '';

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  token.value = params.get('token') || '';
});

async function handleReset() {
  error.value = '';
  message.value = '';
  loading.value = true;
  try {
    await axios.post(`${API_BASE_URL}/api/password-reset`, { email: email.value });
    message.value = 'If your email is registered, a reset link has been sent.';
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to send reset link.';
  } finally {
    loading.value = false;
  }
}

async function handleSetPassword() {
  error.value = '';
  message.value = '';
  loading.value = true;
  try {
    await axios.post(`${API_BASE_URL}/api/reset-password`, { token: token.value, newPassword: password.value });
    message.value = 'Your password has been reset. You may now log in.';
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to reset password.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.password-reset-container {
  max-width: 400px;
  margin: 2em auto;
  padding: 2em;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fff;
}
.success { color: green; margin-top: 1em; }
.error { color: red; margin-top: 1em; }
</style>
