import {
  HabitComponent,
  HabitContainer,
  HabitHistoryItem,
  HabitItem,
  Habits,
  HabitsBulkDeletion,
  HabitsMoreButton,
  NoHabits,
} from "$components/habits.component";
import { EditHabitModal } from "$components/modals.component";
import {
  Notification,
  NotificationItem,
} from "$components/notifications.component";
import { LimitPaginationRadio } from "$components/pagination.component";
import { Habit } from "$db/schema";
import { executeHandlerForSessionUser } from "$lib";
import { habitService } from "$services/habits.service";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { AppVariables } from "src";
import { z } from "zod";

export const habitIdApiController = new Hono<{ Variables: AppVariables }>()
  .put(
    zValidator(
      "param",
      z.object({
        id: z.coerce.number(),
      })
    ),
    zValidator(
      "form",
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ),
    async ({ req, set, html }) => {
      const { id } = req.valid("param");
      const body = req.valid("form");
      const updatedHabit = await habitService.updateById(id, body);
      if (!updatedHabit) {
        throw new Error(`Error with habit id: ${id}`);
      }

      return html(
        <HabitItem
          item={updatedHabit}
          triggerNotification={{
            type: "success",
            message: "Habit updated successfully",
          }}
        />
      );
    }
  )
  .delete(
    zValidator(
      "param",
      z.object({
        id: z.coerce.number(),
      })
    ),
    async ({ req, html, res, get }) => {
      const sessionUser = get("sessionUser");
      const { id } = req.valid("param");
      await habitService.deleteById(id);
      const habitsCount = await executeHandlerForSessionUser(
        (user) => habitService.count(user.id),
        sessionUser
      );
      const notification: Notification = {
        type: "success",
        message: "Habit deleted successfully",
      };
      if (habitsCount === 0) {
        res.headers.append("HX-Trigger", "load-habits");
      }
      return html(<NotificationItem {...notification} />);
    }
  )
  .get(
    "/edit",
    zValidator(
      "param",
      z.object({
        id: z.coerce.number(),
      })
    ),
    zValidator(
      "query",
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ),
    ({ html, req, get }) => {
      const sessionUser = get("sessionUser");
      if (!sessionUser) {
        throw new Error("sessionUser doesn't exist");
      }
      const { id } = req.valid("param");
      const query = req.valid("query");
      const props = { ...query, id };
      return html(<EditHabitModal {...props} />);
    }
  )
  .post(
    "/toggle/:date",
    zValidator(
      "param",
      z.object({
        id: z.coerce.number(),
        date: z.string(),
      })
    ),
    async ({ html, req }) => {
      const { date, id } = req.valid("param");
      const existingHabit = await habitService.findById(id);
      if (!existingHabit) {
        throw new Error(`Habit ${id} doesn't exist`);
      }
      let habitHistory = await habitService.history.findOne(
        existingHabit.id,
        date
      );
      if (habitHistory) {
        await habitService.history.delete(existingHabit.id, habitHistory.date);
      } else {
        await habitService.history.create(existingHabit.id, date);
      }
      return html(
        <HabitHistoryItem
          habit={existingHabit}
          date={date}
          completed={!habitHistory}
        />
      );
    }
  );

export const habitApiController = new Hono<{ Variables: AppVariables }>()
  .get(async ({ html, get }) => {
    const sessionUser = get("sessionUser");
    const [habits, count] = await executeHandlerForSessionUser(
      (user) =>
        Promise.all([
          habitService.findManyByUserId(user.id),
          habitService.count(user.id),
        ]),
      sessionUser
    );
    return html(
      habits.length ? (
        <HabitContainer count={count} habits={habits} limit={4} offset={0} />
      ) : (
        <NoHabits count={count} limit={4} offset={0} />
      )
    );
  })
  .post(
    zValidator(
      "form",
      z.object({
        title: z.string(),
        description: z.string(),
        color: z.string(),
      })
    ),
    async ({ req, text, html, get, res }) => {
      const sessionUser = get("sessionUser");
      if (!sessionUser) {
        throw new Error("Error session user");
      }
      const body = req.valid("form");
      const habitsCount = await habitService.count(sessionUser.id);
      const createdHabit = await habitService.create({
        ...body,
        userId: sessionUser.id,
      });
      if (body.color === "#000000") {
        res.headers.append("HX-Reswap", "innerHTML");
        return text("Please select another color than black", 400);
      }
      if (!createdHabit) {
        res.headers.append("HX-Reswap", "innerHTML");
        return text("An error occured", 500);
      }
      if (habitsCount === 0) {
        res.headers.append("HX-Reswap", "outerHTML");
        return html(<Habits habits={[createdHabit]} />, 201);
      }
      return html(
        <HabitItem
          item={createdHabit}
          triggerNotification={{
            type: "success",
            message: "Habit created successfully",
          }}
        />,
        201
      );
    }
  )
  .get(
    "/more",
    zValidator(
      "query",
      z.object({
        offset: z.coerce.number(),
        limit: z.coerce.number(),
        search: z.optional(z.string()),
      })
    ),
    async ({ html, get, req }) => {
      const { offset, limit, search } = req.valid("query");
      const sessionUser = get("sessionUser");
      const [habits, count] = await executeHandlerForSessionUser(
        async (user) =>
          Promise.all(
            search
              ? [
                  habitService.findByTitle(search, user.id, limit, offset),
                  habitService.countTitle(search, user.id),
                ]
              : [
                  habitService.findManyByUserId(user.id, limit, offset),
                  habitService.count(user.id),
                ]
          ),
        sessionUser
      );
      return html(
        <>
          {habits.map((habit) => (
            <HabitItem item={habit} />
          ))}
          <HabitsMoreButton
            habitLength={habits.length + offset}
            count={count}
            offset={offset}
            limit={limit}
            search={search}
          />
        </>
      );
    }
  )
  .get(
    "/search",
    zValidator(
      "query",
      z.object({
        value: z.string(),
        limit: z.optional(z.coerce.number()),
        offset: z.optional(z.coerce.number()),
      })
    ),
    async ({ req, get, html, header }) => {
      const { value, offset = 0, limit = 4 } = req.valid("query");
      const sessionUser = get("sessionUser");
      const [habits, count] = await executeHandlerForSessionUser(
        (user) =>
          Promise.all([
            value
              ? habitService.findByTitle(value, user.id, limit, offset)
              : habitService.findManyByUserId(user.id),
            habitService.countTitle(value, user.id),
          ]),
        sessionUser
      );
      header("HX-Push-Url", value ? "/habits?search=" + value : "/habits");
      return html(
        <>
          <Habits habits={habits} />
          <HabitsMoreButton
            habitLength={habits.length + offset}
            count={count}
            offset={offset}
            limit={limit}
            search={value}
          />
        </>
      );
    }
  )
  .get("/bulk", ({ html }) => {
    return html(<HabitsBulkDeletion />);
  })
  .get("/reset-bulk", ({ html }) => {
    return html(<LimitPaginationRadio limit={4} />);
  })
  .post(
    "/samples",
    async ({ get, html }) => {
      const limit = 4, offset = 0;
      const sessionUser = get("sessionUser");
      const habits = await executeHandlerForSessionUser(
        (user) => habitService.history.seed(user.id),
        sessionUser
      );
      const count = await executeHandlerForSessionUser(
        (user) => habitService.count(user.id),
        sessionUser
      );
      return html(
        <HabitContainer count={count} habits={habits.slice(0, limit)} limit={4} offset={0} />
      );
    }
  )
  .delete(
    "/bulk",
    zValidator("query", z.object({ items: z.array(z.coerce.number()) })),
    async ({ req, html, res }) => {
      const { items } = req.valid("query");
      await habitService.deleteBulkIds(items);
      const notification: Notification = {
        type: "success",
        message: "Selected habits deleted successfully",
      };
      res.headers.append("HX-Trigger", "load-habits");
      return html(<NotificationItem {...notification} />);
    }
  )
  .route("/:id", habitIdApiController);
