import figma from '../../../../../react/index_react'
import { Avatar } from './Avatar'

figma.connect(Avatar, 'https://figma.com/test/avatar', {
  props: {
    name: figma.string('name'),
  },
  example: ({ name }) => <Avatar name={name} />,
})
