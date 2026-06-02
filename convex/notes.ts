/* eslint-disable */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 실시간으로 모든 메모 리스트 조회
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notes").order("asc").collect();
  },
});

// 새로운 메모 생성
export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("notes", {
      text: args.text,
      x: args.x,
      y: args.y,
      color: args.color,
      shape: args.shape,
      author: args.author,
      createdAt: Date.now(),
    });
    return noteId;
  },
});

// 메모 위치 실시간 변경
export const updatePosition = mutation({
  args: {
    id: v.id("notes"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      x: args.x,
      y: args.y,
    });
  },
});

// 메모 내용 수정
export const updateText = mutation({
  args: {
    id: v.id("notes"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      text: args.text,
    });
  },
});

// 메모 삭제
export const remove = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
