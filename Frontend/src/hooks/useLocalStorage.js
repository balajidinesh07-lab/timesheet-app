import { useState, useEffect } from "react";

/**
 * Safe useLocalStorage hook
 * @param {string} key localStorage key
 * @param {any} initialValue fallback if nothing stored / invalid JSON
 */
export default function useLocalStorage(key, initialValue) {
  const readValue = () => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`⚠️ Error reading localStorage key “${key}”:`, error);
      localStorage.removeItem(key); // clean bad data
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState(readValue);

  // sync state → localStorage
  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`⚠️ Error setting localStorage key “${key}”:`, error);
    }
  };

  // keep in sync across tabs
  useEffect(() => {
    const handleStorage = () => setStoredValue(readValue());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return [storedValue, setValue];
}
