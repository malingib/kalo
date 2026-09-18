import { WEBAPP_URL } from "@kalo/lib/constants";
import { getUserAvatarUrl } from "@kalo/lib/getAvatarUrl";
import type { User } from "@kalo/prisma/client";
import type { UserProfile } from "@kalo/types/UserProfile";
import { useEffect, useState } from "react";
import { AvatarGroup } from "./AvatarGroup";

type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
  users: (Pick<User, "name" | "username" | "avatarUrl"> & {
    profile: Omit<UserProfile, "upId">;
  })[];
};

type AvatarItem = {
  href: string | null;
  alt: string;
  title: string;
  image: string;
};

export function UserAvatarGroup(props: UserAvatarProps) {
  const { users, ...rest } = props;

  const [items, setItems] = useState<AvatarItem[]>(
    users.map((user) => ({
      href: null,
      alt: user.name || "",
      title: user.name || "",
      image: getUserAvatarUrl(user),
    }))
  );

  useEffect(() => {
    setItems(
      users.map((user) => {
        return {
          href: `${WEBAPP_URL}/${user.profile?.username}?redirect=false`,
          alt: user.name || "",
          title: user.name || "",
          image: getUserAvatarUrl(user),
        };
      })
    );
  }, [users]);

  return <AvatarGroup {...rest} items={items} />;
}
