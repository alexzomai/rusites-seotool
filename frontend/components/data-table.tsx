"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Columns3Icon,
  ChevronDownIcon,
  DownloadIcon,
  CalendarIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { ru } from "date-fns/locale";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useIsMobile } from "@/hooks/use-mobile";

export const schema = z.object({
  id: z.number(),
  date: z.string(),
  dayOfWeek: z.string(),
  traffic: z.number(),
  diff: z.number(),
  changePct: z.number().nullable(),
});

export interface CompareSiteRow {
  id: number;
  title: string;
  color?: string;
  data: { date: string; visits: number }[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

type NormalRow = z.infer<typeof schema>;

const NORMAL_FIELDS: { key: keyof NormalRow; label: string }[] = [
  { key: "date", label: "Дата" },
  { key: "dayOfWeek", label: "День недели" },
  { key: "traffic", label: "Трафик" },
  { key: "diff", label: "Разница" },
  { key: "changePct", label: "% изменения" },
];

function downloadCsv(filename: string, rows: string[][]): void {
  const content = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = cell ?? "";
          return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportDialogProps {
  data: NormalRow[];
  compareSites: CompareSiteRow[];
  mainSiteTitle: string;
  isCompareMode: boolean;
}

function ExportDialog({ data, compareSites, mainSiteTitle, isCompareMode }: ExportDialogProps) {
  const [open, setOpen] = React.useState(false);

  // date range — derived from data, reset when data changes
  const { minDate, maxDate } = React.useMemo(() => {
    const dates = data
      .map((r) => r.date)
      .filter(Boolean)
      .sort();
    const toDate = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    return {
      minDate: dates[0] ? toDate(dates[0]) : undefined,
      maxDate: dates[dates.length - 1] ? toDate(dates[dates.length - 1]) : undefined,
    };
  }, [data]);

  const [range, setRange] = React.useState<DateRange | undefined>(() => ({ from: minDate, to: maxDate }));
  React.useEffect(() => {
    setRange({ from: minDate, to: maxDate });
  }, [minDate, maxDate]);

  // normal mode field selection
  const [selectedFields, setSelectedFields] = React.useState<Set<keyof NormalRow>>(
    () => new Set(NORMAL_FIELDS.map((f) => f.key)),
  );

  // compare mode site selection (main + each compare site by id)
  const allCompareCols = React.useMemo(
    () => [{ id: -1, title: mainSiteTitle }, ...compareSites.map((cs) => ({ id: cs.id, title: cs.title }))],
    [compareSites, mainSiteTitle],
  );
  const [selectedCols, setSelectedCols] = React.useState<Set<number>>(() => new Set(allCompareCols.map((c) => c.id)));
  React.useEffect(() => {
    setSelectedCols(new Set(allCompareCols.map((c) => c.id)));
  }, [allCompareCols]);

  function toggleField(key: keyof NormalRow) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleCol(id: number) {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleExport() {
    const toIso = (d: Date) => format(d, "yyyy-MM-dd");
    const fromStr = range?.from ? toIso(range.from) : undefined;
    const toStr = range?.to ? toIso(range.to) : undefined;
    const filteredData = data.filter((row) => {
      if (fromStr && row.date < fromStr) return false;
      if (toStr && row.date > toStr) return false;
      return true;
    });

    if (isCompareMode) {
      // build lookup: id -> date -> visits
      const lookups = new Map<number, Map<string, number>>();
      compareSites.forEach((cs) => {
        const m = new Map<string, number>();
        cs.data.forEach((p) => m.set(p.date, p.visits));
        lookups.set(cs.id, m);
      });

      const activeCols = allCompareCols.filter((c) => selectedCols.has(c.id));
      const header = ["Дата", ...activeCols.map((c) => c.title)];
      const rows: string[][] = [header];
      filteredData.forEach((row) => {
        const cells: string[] = [row.date];
        activeCols.forEach((col) => {
          if (col.id === -1) {
            cells.push(String(row.traffic));
          } else {
            const v = lookups.get(col.id)?.get(row.date);
            cells.push(v != null ? String(v) : "");
          }
        });
        rows.push(cells);
      });
      downloadCsv("seotool-compare.csv", rows);
    } else {
      const activeFields = NORMAL_FIELDS.filter((f) => selectedFields.has(f.key));
      const header = activeFields.map((f) => f.label);
      const rows: string[][] = [header];
      filteredData.forEach((row) => {
        rows.push(
          activeFields.map((f) => {
            const v = row[f.key];
            return v == null ? "" : String(v);
          }),
        );
      });
      downloadCsv("seotool-export.csv", rows);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DownloadIcon data-icon="inline-start" />
          Экспорт
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Экспорт CSV</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Диапазон дат</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
                {range?.from ? (
                  range.to ? (
                    <>
                      {format(range.from, "d MMM yyyy", { locale: ru })}
                      {" — "}
                      {format(range.to, "d MMM yyyy", { locale: ru })}
                    </>
                  ) : (
                    format(range.from, "d MMM yyyy", { locale: ru })
                  )
                ) : (
                  <span className="text-muted-foreground">Выберите период</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 dark" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                defaultMonth={minDate}
                disabled={{ before: minDate ?? new Date(0), after: maxDate ?? new Date() }}
                locale={ru}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-sm font-medium">Поля</p>
        <div className="flex flex-col gap-2">
          {isCompareMode
            ? allCompareCols.map((col) => (
                <label key={col.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={selectedCols.has(col.id)}
                    onCheckedChange={() => toggleCol(col.id)}
                    id={`col-${col.id}`}
                  />
                  <span className="text-sm">{col.title}</span>
                </label>
              ))
            : NORMAL_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={selectedFields.has(f.key)}
                    onCheckedChange={() => toggleField(f.key)}
                    id={`field-${f.key}`}
                  />
                  <span className="text-sm">{f.label}</span>
                </label>
              ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleExport} disabled={isCompareMode ? selectedCols.size === 0 : selectedFields.size === 0}>
            Скачать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Compare table ───────────────────────────────────────────────────────────

interface CompareTableProps {
  data: z.infer<typeof schema>[];
  compareSites: CompareSiteRow[];
  mainSiteTitle: string;
}

function CompareTable({ data, compareSites, mainSiteTitle }: CompareTableProps) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const pageSize = 10;

  // build lookup: compareId -> date -> visits
  const lookups = React.useMemo(() => {
    return compareSites.map((cs) => {
      const m = new Map<string, number>();
      cs.data.forEach((p) => m.set(p.date, p.visits));
      return { id: cs.id, title: cs.title, map: m };
    });
  }, [compareSites]);

  const pageCount = Math.ceil(data.length / pageSize);
  const rows = data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[110px]">Дата</TableHead>
              <TableHead className="text-right">{mainSiteTitle}</TableHead>
              {lookups.map((cs) => (
                <TableHead key={cs.id} className="text-right">
                  {cs.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.date}</TableCell>
                  <TableCell className="text-right">{fmt(row.traffic)}</TableCell>
                  {lookups.map((cs) => {
                    const compareVisits = cs.map.get(row.date);
                    return (
                      <TableCell key={cs.id} className="text-right">
                        {compareVisits != null ? fmt(compareVisits) : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={1 + compareSites.length} className="h-24 text-center">
                  Нет данных.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between px-4">
        <span className="text-muted-foreground hidden text-sm lg:block">{data.length} строк</span>
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-sm font-medium">
            Страница {pageIndex + 1} из {pageCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
            >
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              disabled={pageIndex >= pageCount - 1}
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => setPageIndex(pageCount - 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Normal table ────────────────────────────────────────────────────────────

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    accessorKey: "id",
    header: "#",
    cell: ({ row }) => <div className="text-muted-foreground w-8">{row.original.id}</div>,
  },
  {
    accessorKey: "date",
    header: "Дата",
    cell: ({ row }) => <div>{row.original.date}</div>,
  },
  {
    accessorKey: "dayOfWeek",
    header: "День недели",
    cell: ({ row }) => <div className="text-muted-foreground">{row.original.dayOfWeek}</div>,
  },
  {
    accessorKey: "traffic",
    header: () => <div className="w-full text-right">Трафик</div>,
    cell: ({ row }) => <div className="text-right">{row.original.traffic.toLocaleString("ru-RU")}</div>,
  },
  {
    accessorKey: "diff",
    header: () => <div className="w-full text-right font-bold">Разница</div>,
    cell: ({ row }) => {
      const diff = row.original.diff;
      const isPositive = diff >= 0;
      return (
        <div className={`text-right font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? "+" : ""}
          {diff.toLocaleString("ru-RU")}
        </div>
      );
    },
  },
  {
    accessorKey: "changePct",
    header: () => <div className="w-full text-right">% изм.</div>,
    cell: ({ row }) => {
      const pct = row.original.changePct;
      if (pct == null) return <div className="text-right text-muted-foreground">—</div>;
      const isPositive = pct >= 0;
      return (
        <div className={`text-right font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? "+" : ""}
          {pct.toFixed(1)}%
        </div>
      );
    },
  },
];

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function DataTable({
  data: initialData,
  compareSites = [],
  mainSiteTitle = "Трафик",
}: {
  data: z.infer<typeof schema>[];
  compareSites?: CompareSiteRow[];
  mainSiteTitle?: string;
}) {
  const isCompareMode = compareSites.length > 0;

  const [data, setData] = React.useState(() => initialData);
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const isMobile = useIsMobile();
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() =>
    isMobile ? ({ dayOfWeek: false, changePct: false } as VisibilityState) : ({} as VisibilityState),
  );
  React.useEffect(() => {
    setColumnVisibility(
      isMobile ? ({ dayOfWeek: false, changePct: false } as VisibilityState) : ({} as VisibilityState),
    );
  }, [isMobile]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* toolbar */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h2 className="text-base font-medium">Обзор</h2>
        <div className="flex items-center gap-2">
          {!isCompareMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3Icon data-icon="inline-start" />
                  Колонки
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {table
                  .getAllColumns()
                  .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ExportDialog
            data={data}
            compareSites={compareSites}
            mainSiteTitle={mainSiteTitle}
            isCompareMode={isCompareMode}
          />
        </div>
      </div>

      {/* content */}
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        {isCompareMode ? (
          <CompareTable data={data} compareSites={compareSites} mainSiteTitle={mainSiteTitle} />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
                sensors={sensors}
                id={sortableId}
              >
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody className="**:data-[slot=table-cell]:first:w-8">
                    {table.getRowModel().rows?.length ? (
                      <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                        {table.getRowModel().rows.map((row) => (
                          <DraggableRow key={row.id} row={row} />
                        ))}
                      </SortableContext>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          Нет данных.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between px-4">
              <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                {table.getFilteredRowModel().rows.length} строк
              </div>
              <div className="flex w-full items-center gap-8 lg:w-fit">
                <div className="hidden items-center gap-2 lg:flex">
                  <Label htmlFor="rows-per-page" className="text-sm font-medium">
                    Строк на странице
                  </Label>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                      <SelectValue placeholder={table.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectGroup>
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-fit items-center justify-center text-sm font-medium">
                  Страница {table.getState().pagination.pageIndex + 1} из {table.getPageCount()}
                </div>
                <div className="ml-auto flex items-center gap-2 lg:ml-0">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRightIcon />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden size-8 lg:flex"
                    size="icon"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRightIcon />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
