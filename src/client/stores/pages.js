import { defineStore } from "pinia";
import { Preferences } from "@capacitor/preferences";
import { ref } from "vue";

// Storage key constant
const PAGES_STORAGE_KEY = "navcc_pages";

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

  /* init from preferences */
  const init = async () => {
    if (isInitialized.value) return;
    
    try {
      const { value } = await Preferences.get({ key: PAGES_STORAGE_KEY });
      
      if (value) {
        pagedata.value = JSON.parse(value);
      }
      isInitialized.value = true;
    } catch (error) {
      console.error('Error loading pages from preferences:', error);
      isInitialized.value = true;
    }
  };

  const getPages = async () => {
    await init();
    try {
      const { value } = await Preferences.get({ key: PAGES_STORAGE_KEY });
      if (value) {
        pagedata.value = JSON.parse(value);
      }
    } catch (error) {
      console.error('Error getting pages from preferences:', error);
    }
    return pagedata.value;
  };

  const addPage = async (p) => {
    await init();
    const cleanPage = JSON.parse(JSON.stringify(p));
    pagedata.value.push(cleanPage);
    await Preferences.set({
      key: PAGES_STORAGE_KEY,
      value: JSON.stringify(getCleanPages())
    });
  };

  const newPage = async () => {
    await init();
    const myNewPage = { template: null, title: "", widgets: {} };
    pagedata.value.push(myNewPage);
    await Preferences.set({
      key: PAGES_STORAGE_KEY,
      value: JSON.stringify(getCleanPages())
    });
    return myNewPage;
  };

  const deletePage = async (index) => {
    await init();
    if (index > -1) {
      pagedata.value.splice(index, 1);
      await Preferences.set({
        key: PAGES_STORAGE_KEY,
        value: JSON.stringify(getCleanPages())
      });
    }
  };

  const deleteAllPages = async () => {
    await init();
    pagedata.value = [];
    await Preferences.set({
      key: PAGES_STORAGE_KEY,
      value: JSON.stringify([])
    });
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
        const cleanPages = getCleanPages();
        // console.log('Saving pages to storage:', cleanPages);
        await Preferences.set({
          key: PAGES_STORAGE_KEY,
          value: JSON.stringify(cleanPages)
        });
        pagedata.value = cleanPages;
        // console.log('Pages updated successfully');
      } catch (error) {
        console.error('Error saving pages to preferences:', error);
      }
    } else {
      console.error('Invalid page index:', index);
    }
  };

  const savePages = async () => {
    await init();
    const cleanPages = getCleanPages();
    await Preferences.set({
      key: PAGES_STORAGE_KEY,
      value: JSON.stringify(cleanPages)
    });
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
    await Preferences.set({
      key: PAGES_STORAGE_KEY,
      value: JSON.stringify(getCleanPages())
    });
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
