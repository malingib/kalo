import { useIsEmbed } from "@kalo/embed-core/embed-iframe";
import { getPlaceholderAvatar } from "@kalo/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@kalo/lib/getAvatarUrl";
import type { Team, User } from "@kalo/prisma/client";
import { AvatarGroup } from "./AvatarGroup";

type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
  users: (Pick<User, "name" | "username" | "avatarUrl"> & {
    bookerUrl: string;
  })[];
  organization: Pick<Team, "slug" | "name" | "logoUrl">;
  disableHref?: boolean;
};

export function UserAvatarGroupWithOrg(props: UserAvatarProps) {
  const { users, organization, disableHref = false, ...rest } = props;
  const isEmbed = useIsEmbed();

  const items = [
    {
      // We don't want booker to be able to see the list of other users or teams inside the embed
      href: isEmbed || disableHref ? null : "/",
      image: getPlaceholderAvatar(organization.logoUrl, organization.name),
      alt: organization.name || undefined,
      title: organization.name,
    },
  ].concat(
    users.map((user) => {
      return {
        href: disableHref ? null : `${user.bookerUrl}/${user.username}?redirect=false`,
        image: getUserAvatarUrl(user),
        alt: user.name || undefined,
        title: user.name || user.username || "",
      };
    })
  );
  return <AvatarGroup {...rest} items={items} />;
}
