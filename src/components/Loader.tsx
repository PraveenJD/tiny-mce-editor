import { CircularProgress } from "@mui/material";

const Loader = () => {
  return (
    <div className="h-full flex items-center justify-center bg-black/5 rounded-2xl">
      <CircularProgress />
    </div>
  );
};

export default Loader;
