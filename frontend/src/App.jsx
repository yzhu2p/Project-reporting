import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BackorderReport from './components/BackorderReport';
import ProjectCosting from './components/ProjectCosting';
import CustomerPOs from './components/CustomerPOs';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  // Apply dark mode class to root HTML element when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <Layout theme={theme} setTheme={setTheme}>
      <Routes>
        <Route path="/project/backorders" element={<BackorderReport />} />
        <Route path="/project/backorders/:orderNumberParam" element={<BackorderReport />} />
        <Route path="/project/costing" element={<ProjectCosting />} />
        <Route path="/project/costing/:orderNumberParam" element={<ProjectCosting />} />
        <Route path="/project/customer-pos" element={<CustomerPOs />} />
        <Route path="*" element={<Navigate to="/project/backorders" replace />} />
      </Routes>
    </Layout>
  );
}
