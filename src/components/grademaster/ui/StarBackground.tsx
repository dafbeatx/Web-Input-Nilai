import React from 'react';

const Pattern = () => {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden opacity-40 mix-blend-screen bg-black" aria-hidden="true">
      {/* GPU Accelerated Colorful Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300vw] h-[300vh] animated-blobs opacity-90" />
      
      {/* Static Overlying Grid Mask */}
      <div className="absolute inset-0 static-grid" />
      
      <style>{`
        .animated-blobs {
          background-image: 
            radial-gradient(circle at 30% 70%, #f00, #f000 60%),
            radial-gradient(circle at 70% 30%, #ff0, #ff00 60%),
            radial-gradient(circle at 30% 30%, #0f0, #0f00 60%),
            radial-gradient(ellipse at 70% 70%, #00f, #00f0 60%);
          /* Animate using transform instead of background-position for butter-smooth 60fps on mobile */
          animation: spinBlobs 30s linear infinite;
          will-change: transform;
          transform-origin: center center;
        }

        .static-grid {
          --c: 7px;
          background-image: 
            radial-gradient(
              circle at 50% 50%,
              #0000 1.5px,
              #000 0 var(--c),
              #0000 var(--c)
            ),
            radial-gradient(
              circle at 50% 50%,
              #0000 1.5px,
              #000 0 var(--c),
              #0000 var(--c)
            );
          background-size: 12px 20.7846097px, 12px 20.7846097px;
          background-position: 0px 0px, 6px 10.39230485px;
          will-change: transform; /* Hinting browser that layer is composited */
        }

        /* 100% GPU Accelerated Transform Animation */
        @keyframes spinBlobs {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.1); }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
        }

        /* Responsive Optimization tweaks */
        @media (max-width: 768px) {
           .animated-blobs {
              /* Ensure blobs animate smoother and simpler on weak hardware */
              animation: spinBlobs 45s linear infinite;
           }
           /* Further reduce rendering workload on mobile browsers */
           .static-grid {
              will-change: auto; 
           }
        }
      `}</style>
    </div>
  );
};

export default Pattern;
