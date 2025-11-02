<template>
  <div class="register-container">
    <form @submit.prevent="handleRegister" class="register-form">
      <h2>Register</h2>
      <div class="form-group">
        <label for="email">Email</label>
        <input v-model="email" id="email" type="email" autocomplete="email" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input v-model="password" id="password" type="password" autocomplete="new-password" required />
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input v-model="confirmPassword" id="confirmPassword" type="password" autocomplete="new-password" required />
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">Registration successful! You can now log in.</div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Registering...' : 'Register' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);

const API_BASE_URL = import.meta.env.VITE_VPS_API_URL || '';

async function handleRegister() {
  error.value = '';
  success.value = false;
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match.";
    return;
  }
  loading.value = true;
  try {
    const payload = {
      username: email.value,
      email: email.value,
      password: password.value
    };
    const response = await axios.post(`${API_BASE_URL}/api/register`, payload);
    if (response.data && response.data.success) {
      success.value = true;
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
    } else {
      error.value = response.data.error || 'Registration failed.';
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Network error.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem 2.5rem;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.register-form h2 {
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
  background: #388e3c;
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
.success {
  color: #388e3c;
  margin-bottom: 1rem;
  text-align: center;
}
</style>