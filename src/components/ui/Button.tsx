import React from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const styles = {
  base:
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 disabled:opacity-60 disabled:cursor-not-allowed",
  variant: {
    primary: "bg-[#3B82F6] hover:bg-[#60A5FA] text-white",
    secondary: "bg-white/10 hover:bg-white/15 text-white",
    ghost: "hover:bg-white/10 text-slate-200",
    danger: "bg-red-600 hover:bg-red-500 text-white",
  },
  size: {
    sm: "h-10 px-4 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base",
  },
};

export default function Button({ variant = "secondary", size = "md", className, ...props }: Props) {
  const feedback = (props as { ["data-feedback"]?: string })["data-feedback"];
  const tone = (props as { ["data-tone"]?: "warn" | "info" })["data-tone"];

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    if (props.onClick) {
      props.onClick(event);
      return;
    }
    if (props.type === "submit") return;
    const message = feedback || "Action queued (stub). Wire logic to enable.";
    window.dispatchEvent(
      new CustomEvent("lexipro-toast", {
        detail: { message, tone: tone || "info" }
      })
    );
  };

  return (
    <button
      className={cn(styles.base, styles.variant[variant], styles.size[size], className)}
      {...props}
      onClick={handleClick}
    />
  );
}
