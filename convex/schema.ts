import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    text: v.string(),
    x: v.number(),
    y: v.number(),
    color: v.string(),
    shape: v.union(
      v.literal("square"),
      v.literal("circle"),
      v.literal("apple"),
      v.literal("heart")
    ),
    author: v.string(),
    createdAt: v.number(),
    reactions: v.optional(
      v.object({
        thumbsup: v.number(),
        heart: v.number(),
        surprised: v.number(),
        laugh: v.number(),
        fire: v.number(),
      })
    ),
    password: v.optional(v.string()),
  }).index("by_createdAt", ["createdAt"]),
});

