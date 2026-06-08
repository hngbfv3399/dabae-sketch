/* eslint-disable */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 실시간으로 모든 메모 리스트 조회 (최근 300개 제한)
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_createdAt")
      .order("desc")
      .take(300);
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
    password: v.optional(v.string()),
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
      reactions: {
        thumbsup: 0,
        heart: 0,
        surprised: 0,
        laugh: 0,
        fire: 0,
      },
      password: args.password,
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
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note not found");
    }
    if (note.password && note.password !== args.password) {
      throw new Error("Incorrect password");
    }
    await ctx.db.delete(args.id);
  },
});

// 이모지 리액션 추가
export const addReaction = mutation({
  args: {
    id: v.id("notes"),
    reactionType: v.union(
      v.literal("thumbsup"),
      v.literal("heart"),
      v.literal("surprised"),
      v.literal("laugh"),
      v.literal("fire")
    ),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note not found");
    }
    const currentReactions = note.reactions || {
      thumbsup: 0,
      heart: 0,
      surprised: 0,
      laugh: 0,
      fire: 0,
    };
    const updatedReactions = {
      ...currentReactions,
      [args.reactionType]: (currentReactions[args.reactionType] || 0) + 1,
    };
    await ctx.db.patch(args.id, {
      reactions: updatedReactions,
    });
  },
});

