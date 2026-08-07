import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("uses the product name in its default accessibility labels", () => {
    render(<Logo />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Kalo");
    expect(img).toHaveAttribute("title", "Kalo");
  });
});
