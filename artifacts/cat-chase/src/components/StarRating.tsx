import { motion } from "framer-motion";
import { Star } from "lucide-react";

export const StarRating = ({ stars, size = 36, animate = false }: { stars: number; size?: number; animate?: boolean }) => (
  <div className="flex gap-1.5">
    {[0, 1, 2].map((i) => {
      const filled = i < stars;
      return (
        <motion.div
          key={i}
          initial={animate ? { scale: 0, rotate: -180 } : false}
          animate={animate ? { scale: 1, rotate: 0 } : undefined}
          transition={{ delay: i * 0.15, type: "spring", stiffness: 200 }}
        >
          <Star
            size={size}
            fill={filled ? "#facc15" : "transparent"}
            color={filled ? "#ca8a04" : "#94a3b8"}
            strokeWidth={2.5}
          />
        </motion.div>
      );
    })}
  </div>
);
