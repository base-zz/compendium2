import { defineStore } from "pinia";
import { Storage, Drivers } from "@ionic/storage";
import { ref } from "vue";

// Create a singleton storage instance
let localstore = null;

const initStorage = async () => {
  if (!localstore) {
    localstore = new Storage({
      name: "__navcc",
      driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
    });
    await localstore.create();
  }
  return localstore;
};

/* 
 * the pages store
 */
export const usePageStore = defineStore("pages", () => {
  /* the pages container */
  const pagedata = ref([]);
  const isInitialized = ref(false);
  const currentPage = ref(0);

  /* strip out all the ref stuff before writing to storage */
  function getCleanPages() {
    return JSON.parse(JSON.stringify(pagedata.value));
  }

  const getPage = (index) => {
    if (typeof index === 'undefined' || index < 0 || index >= pagedata.value.length) {
      return null;
    }
    return pagedata.value[index];
  };

  /* init local store */
  const init = async () => {
    if (isInitialized.value) return;
    
    const storage = await initStorage();
    const storedPages = await storage.get("pages");
    
    if (storedPages) {
      pagedata.value = storedPages;
    }
    isInitialized.value = true;
  };

  const getPages = async () => {
    await init();
    const storage = await initStorage();
    const storedPages = await storage.get("pages");
    if (storedPages) {
      pagedata.value = storedPages;
    }
    return pagedata.value;
  };

  const addPage = async (p) => {
    await init();
    const cleanPage = JSON.parse(JSON.stringify(p));
    pagedata.value.push(cleanPage);
    const storage = await initStorage();
    await storage.set("pages", getCleanPages());
  };

  const newPage = async () => {
    await init();
    const myNewPage = { template: null, title: "", widgets: {} };
    pagedata.value.push(myNewPage);
    const storage = await initStorage();
    await storage.set("pages", getCleanPages());
    return myNewPage;
  };

  const deletePage = async (index) => {
    await init();
    if (index > -1) {
      pagedata.value.splice(index, 1);
      const storage = await initStorage();
      await storage.set("pages", getCleanPages());
    }
  };

  const deleteAllPages = async () => {
    await init();
    pagedata.value = [];
    const storage = await initStorage();
    await storage.set("pages", []);
  };

  const updatePage = async (index, page) => {
    await init();
    if (index > -1) {
      // console.log('Updating page at index', index, 'with', page);
      
      // Create a clean copy of the page
      const cleanPage = JSON.parse(JSON.stringify({
        template: page.template || null,
        title: page.title || "",
        widgets: page.widgets || {}
      }));
      
      // console.log('Clean page object:', cleanPage);
      // console.log('Widgets in clean page:', cleanPage.widgets);

      // Update the page
      pagedata.value[index] = cleanPage;
      
      // Save to storage
      try {
        const storage = await initStorage();
        const cleanPages = getCleanPages();
        // console.log('Saving pages to storage:', cleanPages);
        await storage.set("pages", cleanPages);
        pagedata.value = cleanPages;
        // console.log('Pages updated successfully');
      } catch (error) {
        console.error('Error saving pages to storage:', error);
      }
    } else {
      console.error('Invalid page index:', index);
    }
  };

  const savePages = async () => {
    await init();
    const storage = await initStorage();
    const cleanPages = getCleanPages();
    await storage.set("pages", cleanPages);
    pagedata.value = cleanPages;
  };

  const reorderPages = async (indexArray) => {
    await init();
    if (!indexArray || indexArray.length === 0) return;
    const ar = [];
    indexArray.forEach((i) => {
      const r = pagedata.value[i];
      if (r) ar.push(r);
    });

    pagedata.value = ar;
    const storage = await initStorage();
    await storage.set("pages", getCleanPages());
  };

  return { 
    pagedata, 
    currentPage,
    isInitialized,
    getPage,
    init,
    getPages, 
    addPage, 
    savePages, 
    deletePage, 
    deleteAllPages, 
    updatePage, 
    newPage, 
    reorderPages 
  };
});
