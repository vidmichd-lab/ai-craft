import React from "react"
import figma from "@figma/code-connect"
import { Button } from "@ai-craft/ui"

figma.connect(
  Button,
  "https://www.figma.com/design/gcz1z0827AM5nz6Ise741e/Simple-Design-System--Community-?node-id=4185%3A3778",
  {
    props: {
      label: figma.string("Label"),
      variant: figma.enum("Variant", {
        Primary: "inverted",
        Neutral: "secondary",
        Subtle: "secondary"
      }),
      disabled: figma.enum("State", {
        Default: false,
        Hover: false,
        Disabled: true
      }),
      size: figma.enum("Size", {
        Medium: "md",
        Small: "sm"
      })
    },
    example: ({ label, variant, disabled, size }) => (
      <Button variant={variant} disabled={disabled} size={size}>
        {label}
      </Button>
    )
  }
)
