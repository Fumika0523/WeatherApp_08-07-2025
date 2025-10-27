// components/LoadingBar.jsx
import React from "react";

export default function LoadingBar() {
  return (
    <div className="w-full max-w-4xl mt-4">
      <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-loadingBar" />
      </div>
    </div>
  );
}
