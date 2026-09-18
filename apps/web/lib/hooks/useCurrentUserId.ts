import useMeQuery from "@kalo/trpc/react/hooks/useMeQuery";

export const useCurrentUserId = () => {
  const query = useMeQuery();
  const user = query.data;
  return user?.id;
};

export default useCurrentUserId;
