<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Login</h2>
      <div class="form-group">
        <label for="email">Email</label>
        <input v-model="email" id="email" type="email" autocomplete="username" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input v-model="password" id="password" type="password" autocomplete="current-password" required />
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
      <div style="margin-top: 1em;">
        <router-link to="/forgot-password">Forgot Password?</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const API_BASE_URL = import.meta.env.VITE_VPS_API_URL || '';
const router = useRouter();

const emit = defineEmits(['login-success']);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    const payload = {
      username: email.value,
      email: email.value,
      password: password.value
    };
    const response = await axios.post(`${API_BASE_URL}/api/login`, payload);
    if (response.data && response.data.success && response.data.token) {
      // Store token in localStorage
      localStorage.setItem('auth_token', response.data.token);
      // Store boat IDs as an array under 'boatIds'
      if (response.data.boats && Array.isArray(response.data.boats)) {
        const boatIds = response.data.boats.map(b => b.boatId);
        localStorage.setItem('boatIds', JSON.stringify(boatIds));
        // Set activeBoatId if not already set
        if (boatIds.length > 0) {
          localStorage.setItem('activeBoatId', boatIds[0]);
        } else {
          localStorage.setItem('activeBoatId', null);
        }
      }
      // Redirect to home after login
      console.log('Login successful, redirecting')
      router.push('/');
      window.location.href = '/';
    } else {
      error.value = response.data.error || 'Login failed.';
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Network error.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  max-width: 350px;
  margin: 2rem auto;
  padding: 2rem 2.5rem;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.login-form h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}
input[type="text"], input[type="email"], input[type="password"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}
button[type="submit"] {
  width: 100%;
  padding: 0.7rem;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #d32f2f;
  margin-bottom: 1rem;
  text-align: center;
}
</style>
