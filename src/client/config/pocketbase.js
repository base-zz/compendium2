import PocketBase from 'pocketbase';
import { ref, computed } from 'vue';

// Get PocketBase URL from environment variables
const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://82.29.152.15:8090';
console.log("Initializing PocketBase with URL:", pocketbaseUrl);

// Create PocketBase client
const pb = new PocketBase(pocketbaseUrl);
pb.autoCancellation(false);
pb.beforeSend = function (url, options) {
  if (pb.authStore.isValid) {
    options.headers = options.headers || {};
    options.headers['X-User-ID'] = pb.authStore.model.id;
  }
  return { url, options };
};
export default pb;

// Current user state
const currentUser = ref(null);
const isLoggedIn = computed(() => currentUser.value !== null);

// Try to restore auth on page load
try {
  // If there's a valid auth data in the storage, use it to set the current user
  const authData = pb.authStore.model;
  if (authData) {
    currentUser.value = authData;
  }
} catch (error) {
  console.error('Error restoring auth:', error);
}

// Set up auth store change listener
pb.authStore.onChange((token, model) => {
  console.log("Auth store changed:", { token: !!token, model: !!model });
  currentUser.value = model;
  console.log('Auth state changed:', model ? 'Logged in' : 'Logged out');
});

// Login function
async function login(email, password) {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    currentUser.value = authData.record;
    return authData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Logout function
function logout() {
  pb.authStore.clear();
  currentUser.value = null;
}

// Register function
async function register(email, password, passwordConfirm, name) {
  try {
    const data = {
      email,
      password,
      passwordConfirm,
      name
    };
    const record = await pb.collection('users').create(data);
    
    // Auto login after registration
    if (record) {
      return login(email, password);
    }
    
    return record;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export { pb, currentUser, isLoggedIn, login, logout, register };
