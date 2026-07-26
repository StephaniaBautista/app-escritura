import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace";
/**
 * Model World
 *
 */
export type WorldModel = runtime.Types.Result.DefaultSelection<Prisma.$WorldPayload>;
export type AggregateWorld = {
    _count: WorldCountAggregateOutputType | null;
    _min: WorldMinAggregateOutputType | null;
    _max: WorldMaxAggregateOutputType | null;
};
export type WorldMinAggregateOutputType = {
    id: string | null;
    name: string | null;
    description: string | null;
    projectId: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type WorldMaxAggregateOutputType = {
    id: string | null;
    name: string | null;
    description: string | null;
    projectId: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type WorldCountAggregateOutputType = {
    id: number;
    name: number;
    description: number;
    content: number;
    projectId: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type WorldMinAggregateInputType = {
    id?: true;
    name?: true;
    description?: true;
    projectId?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type WorldMaxAggregateInputType = {
    id?: true;
    name?: true;
    description?: true;
    projectId?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type WorldCountAggregateInputType = {
    id?: true;
    name?: true;
    description?: true;
    content?: true;
    projectId?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type WorldAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which World to aggregate.
     */
    where?: Prisma.WorldWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Worlds to fetch.
     */
    orderBy?: Prisma.WorldOrderByWithRelationInput | Prisma.WorldOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: Prisma.WorldWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Worlds from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Worlds.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Worlds
    **/
    _count?: true | WorldCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
    **/
    _min?: WorldMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
    **/
    _max?: WorldMaxAggregateInputType;
};
export type GetWorldAggregateType<T extends WorldAggregateArgs> = {
    [P in keyof T & keyof AggregateWorld]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateWorld[P]> : Prisma.GetScalarType<T[P], AggregateWorld[P]>;
};
export type WorldGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.WorldWhereInput;
    orderBy?: Prisma.WorldOrderByWithAggregationInput | Prisma.WorldOrderByWithAggregationInput[];
    by: Prisma.WorldScalarFieldEnum[] | Prisma.WorldScalarFieldEnum;
    having?: Prisma.WorldScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: WorldCountAggregateInputType | true;
    _min?: WorldMinAggregateInputType;
    _max?: WorldMaxAggregateInputType;
};
export type WorldGroupByOutputType = {
    id: string;
    name: string;
    description: string | null;
    content: runtime.JsonValue;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    _count: WorldCountAggregateOutputType | null;
    _min: WorldMinAggregateOutputType | null;
    _max: WorldMaxAggregateOutputType | null;
};
export type GetWorldGroupByPayload<T extends WorldGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<WorldGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof WorldGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], WorldGroupByOutputType[P]> : Prisma.GetScalarType<T[P], WorldGroupByOutputType[P]>;
}>>;
export type WorldWhereInput = {
    AND?: Prisma.WorldWhereInput | Prisma.WorldWhereInput[];
    OR?: Prisma.WorldWhereInput[];
    NOT?: Prisma.WorldWhereInput | Prisma.WorldWhereInput[];
    id?: Prisma.StringFilter<"World"> | string;
    name?: Prisma.StringFilter<"World"> | string;
    description?: Prisma.StringNullableFilter<"World"> | string | null;
    content?: Prisma.JsonFilter<"World">;
    projectId?: Prisma.StringFilter<"World"> | string;
    createdAt?: Prisma.DateTimeFilter<"World"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"World"> | Date | string;
    project?: Prisma.XOR<Prisma.ProjectScalarRelationFilter, Prisma.ProjectWhereInput>;
};
export type WorldOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    content?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    project?: Prisma.ProjectOrderByWithRelationInput;
};
export type WorldWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.WorldWhereInput | Prisma.WorldWhereInput[];
    OR?: Prisma.WorldWhereInput[];
    NOT?: Prisma.WorldWhereInput | Prisma.WorldWhereInput[];
    name?: Prisma.StringFilter<"World"> | string;
    description?: Prisma.StringNullableFilter<"World"> | string | null;
    content?: Prisma.JsonFilter<"World">;
    projectId?: Prisma.StringFilter<"World"> | string;
    createdAt?: Prisma.DateTimeFilter<"World"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"World"> | Date | string;
    project?: Prisma.XOR<Prisma.ProjectScalarRelationFilter, Prisma.ProjectWhereInput>;
}, "id">;
export type WorldOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    content?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.WorldCountOrderByAggregateInput;
    _max?: Prisma.WorldMaxOrderByAggregateInput;
    _min?: Prisma.WorldMinOrderByAggregateInput;
};
export type WorldScalarWhereWithAggregatesInput = {
    AND?: Prisma.WorldScalarWhereWithAggregatesInput | Prisma.WorldScalarWhereWithAggregatesInput[];
    OR?: Prisma.WorldScalarWhereWithAggregatesInput[];
    NOT?: Prisma.WorldScalarWhereWithAggregatesInput | Prisma.WorldScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"World"> | string;
    name?: Prisma.StringWithAggregatesFilter<"World"> | string;
    description?: Prisma.StringNullableWithAggregatesFilter<"World"> | string | null;
    content?: Prisma.JsonWithAggregatesFilter<"World">;
    projectId?: Prisma.StringWithAggregatesFilter<"World"> | string;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"World"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"World"> | Date | string;
};
export type WorldCreateInput = {
    id?: string;
    name: string;
    description?: string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    project: Prisma.ProjectCreateNestedOneWithoutWorldsInput;
};
export type WorldUncheckedCreateInput = {
    id?: string;
    name: string;
    description?: string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    projectId: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type WorldUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    project?: Prisma.ProjectUpdateOneRequiredWithoutWorldsNestedInput;
};
export type WorldUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WorldCreateManyInput = {
    id?: string;
    name: string;
    description?: string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    projectId: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type WorldUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WorldUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    projectId?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WorldListRelationFilter = {
    every?: Prisma.WorldWhereInput;
    some?: Prisma.WorldWhereInput;
    none?: Prisma.WorldWhereInput;
};
export type WorldOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type WorldCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    content?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type WorldMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type WorldMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    name?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    projectId?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type WorldCreateNestedManyWithoutProjectInput = {
    create?: Prisma.XOR<Prisma.WorldCreateWithoutProjectInput, Prisma.WorldUncheckedCreateWithoutProjectInput> | Prisma.WorldCreateWithoutProjectInput[] | Prisma.WorldUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.WorldCreateOrConnectWithoutProjectInput | Prisma.WorldCreateOrConnectWithoutProjectInput[];
    createMany?: Prisma.WorldCreateManyProjectInputEnvelope;
    connect?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
};
export type WorldUncheckedCreateNestedManyWithoutProjectInput = {
    create?: Prisma.XOR<Prisma.WorldCreateWithoutProjectInput, Prisma.WorldUncheckedCreateWithoutProjectInput> | Prisma.WorldCreateWithoutProjectInput[] | Prisma.WorldUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.WorldCreateOrConnectWithoutProjectInput | Prisma.WorldCreateOrConnectWithoutProjectInput[];
    createMany?: Prisma.WorldCreateManyProjectInputEnvelope;
    connect?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
};
export type WorldUpdateManyWithoutProjectNestedInput = {
    create?: Prisma.XOR<Prisma.WorldCreateWithoutProjectInput, Prisma.WorldUncheckedCreateWithoutProjectInput> | Prisma.WorldCreateWithoutProjectInput[] | Prisma.WorldUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.WorldCreateOrConnectWithoutProjectInput | Prisma.WorldCreateOrConnectWithoutProjectInput[];
    upsert?: Prisma.WorldUpsertWithWhereUniqueWithoutProjectInput | Prisma.WorldUpsertWithWhereUniqueWithoutProjectInput[];
    createMany?: Prisma.WorldCreateManyProjectInputEnvelope;
    set?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    disconnect?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    delete?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    connect?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    update?: Prisma.WorldUpdateWithWhereUniqueWithoutProjectInput | Prisma.WorldUpdateWithWhereUniqueWithoutProjectInput[];
    updateMany?: Prisma.WorldUpdateManyWithWhereWithoutProjectInput | Prisma.WorldUpdateManyWithWhereWithoutProjectInput[];
    deleteMany?: Prisma.WorldScalarWhereInput | Prisma.WorldScalarWhereInput[];
};
export type WorldUncheckedUpdateManyWithoutProjectNestedInput = {
    create?: Prisma.XOR<Prisma.WorldCreateWithoutProjectInput, Prisma.WorldUncheckedCreateWithoutProjectInput> | Prisma.WorldCreateWithoutProjectInput[] | Prisma.WorldUncheckedCreateWithoutProjectInput[];
    connectOrCreate?: Prisma.WorldCreateOrConnectWithoutProjectInput | Prisma.WorldCreateOrConnectWithoutProjectInput[];
    upsert?: Prisma.WorldUpsertWithWhereUniqueWithoutProjectInput | Prisma.WorldUpsertWithWhereUniqueWithoutProjectInput[];
    createMany?: Prisma.WorldCreateManyProjectInputEnvelope;
    set?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    disconnect?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    delete?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    connect?: Prisma.WorldWhereUniqueInput | Prisma.WorldWhereUniqueInput[];
    update?: Prisma.WorldUpdateWithWhereUniqueWithoutProjectInput | Prisma.WorldUpdateWithWhereUniqueWithoutProjectInput[];
    updateMany?: Prisma.WorldUpdateManyWithWhereWithoutProjectInput | Prisma.WorldUpdateManyWithWhereWithoutProjectInput[];
    deleteMany?: Prisma.WorldScalarWhereInput | Prisma.WorldScalarWhereInput[];
};
export type WorldCreateWithoutProjectInput = {
    id?: string;
    name: string;
    description?: string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type WorldUncheckedCreateWithoutProjectInput = {
    id?: string;
    name: string;
    description?: string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type WorldCreateOrConnectWithoutProjectInput = {
    where: Prisma.WorldWhereUniqueInput;
    create: Prisma.XOR<Prisma.WorldCreateWithoutProjectInput, Prisma.WorldUncheckedCreateWithoutProjectInput>;
};
export type WorldCreateManyProjectInputEnvelope = {
    data: Prisma.WorldCreateManyProjectInput | Prisma.WorldCreateManyProjectInput[];
    skipDuplicates?: boolean;
};
export type WorldUpsertWithWhereUniqueWithoutProjectInput = {
    where: Prisma.WorldWhereUniqueInput;
    update: Prisma.XOR<Prisma.WorldUpdateWithoutProjectInput, Prisma.WorldUncheckedUpdateWithoutProjectInput>;
    create: Prisma.XOR<Prisma.WorldCreateWithoutProjectInput, Prisma.WorldUncheckedCreateWithoutProjectInput>;
};
export type WorldUpdateWithWhereUniqueWithoutProjectInput = {
    where: Prisma.WorldWhereUniqueInput;
    data: Prisma.XOR<Prisma.WorldUpdateWithoutProjectInput, Prisma.WorldUncheckedUpdateWithoutProjectInput>;
};
export type WorldUpdateManyWithWhereWithoutProjectInput = {
    where: Prisma.WorldScalarWhereInput;
    data: Prisma.XOR<Prisma.WorldUpdateManyMutationInput, Prisma.WorldUncheckedUpdateManyWithoutProjectInput>;
};
export type WorldScalarWhereInput = {
    AND?: Prisma.WorldScalarWhereInput | Prisma.WorldScalarWhereInput[];
    OR?: Prisma.WorldScalarWhereInput[];
    NOT?: Prisma.WorldScalarWhereInput | Prisma.WorldScalarWhereInput[];
    id?: Prisma.StringFilter<"World"> | string;
    name?: Prisma.StringFilter<"World"> | string;
    description?: Prisma.StringNullableFilter<"World"> | string | null;
    content?: Prisma.JsonFilter<"World">;
    projectId?: Prisma.StringFilter<"World"> | string;
    createdAt?: Prisma.DateTimeFilter<"World"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"World"> | Date | string;
};
export type WorldCreateManyProjectInput = {
    id?: string;
    name: string;
    description?: string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type WorldUpdateWithoutProjectInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WorldUncheckedUpdateWithoutProjectInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WorldUncheckedUpdateManyWithoutProjectInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    name?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    content?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WorldSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    description?: boolean;
    content?: boolean;
    projectId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["world"]>;
export type WorldSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    description?: boolean;
    content?: boolean;
    projectId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["world"]>;
export type WorldSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    name?: boolean;
    description?: boolean;
    content?: boolean;
    projectId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["world"]>;
export type WorldSelectScalar = {
    id?: boolean;
    name?: boolean;
    description?: boolean;
    content?: boolean;
    projectId?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type WorldOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "name" | "description" | "content" | "projectId" | "createdAt" | "updatedAt", ExtArgs["result"]["world"]>;
export type WorldInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
};
export type WorldIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
};
export type WorldIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    project?: boolean | Prisma.ProjectDefaultArgs<ExtArgs>;
};
export type $WorldPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "World";
    objects: {
        project: Prisma.$ProjectPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        name: string;
        description: string | null;
        content: runtime.JsonValue;
        projectId: string;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["world"]>;
    composites: {};
};
export type WorldGetPayload<S extends boolean | null | undefined | WorldDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$WorldPayload, S>;
export type WorldCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<WorldFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: WorldCountAggregateInputType | true;
};
export interface WorldDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['World'];
        meta: {
            name: 'World';
        };
    };
    /**
     * Find zero or one World that matches the filter.
     * @param {WorldFindUniqueArgs} args - Arguments to find a World
     * @example
     * // Get one World
     * const world = await prisma.world.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WorldFindUniqueArgs>(args: Prisma.SelectSubset<T, WorldFindUniqueArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find one World that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WorldFindUniqueOrThrowArgs} args - Arguments to find a World
     * @example
     * // Get one World
     * const world = await prisma.world.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WorldFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, WorldFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first World that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorldFindFirstArgs} args - Arguments to find a World
     * @example
     * // Get one World
     * const world = await prisma.world.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WorldFindFirstArgs>(args?: Prisma.SelectSubset<T, WorldFindFirstArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first World that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorldFindFirstOrThrowArgs} args - Arguments to find a World
     * @example
     * // Get one World
     * const world = await prisma.world.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WorldFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, WorldFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find zero or more Worlds that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorldFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Worlds
     * const worlds = await prisma.world.findMany()
     *
     * // Get first 10 Worlds
     * const worlds = await prisma.world.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const worldWithIdOnly = await prisma.world.findMany({ select: { id: true } })
     *
     */
    findMany<T extends WorldFindManyArgs>(args?: Prisma.SelectSubset<T, WorldFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    /**
     * Create a World.
     * @param {WorldCreateArgs} args - Arguments to create a World.
     * @example
     * // Create one World
     * const World = await prisma.world.create({
     *   data: {
     *     // ... data to create a World
     *   }
     * })
     *
     */
    create<T extends WorldCreateArgs>(args: Prisma.SelectSubset<T, WorldCreateArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Create many Worlds.
     * @param {WorldCreateManyArgs} args - Arguments to create many Worlds.
     * @example
     * // Create many Worlds
     * const world = await prisma.world.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends WorldCreateManyArgs>(args?: Prisma.SelectSubset<T, WorldCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Create many Worlds and returns the data saved in the database.
     * @param {WorldCreateManyAndReturnArgs} args - Arguments to create many Worlds.
     * @example
     * // Create many Worlds
     * const world = await prisma.world.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Worlds and only return the `id`
     * const worldWithIdOnly = await prisma.world.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends WorldCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, WorldCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    /**
     * Delete a World.
     * @param {WorldDeleteArgs} args - Arguments to delete one World.
     * @example
     * // Delete one World
     * const World = await prisma.world.delete({
     *   where: {
     *     // ... filter to delete one World
     *   }
     * })
     *
     */
    delete<T extends WorldDeleteArgs>(args: Prisma.SelectSubset<T, WorldDeleteArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Update one World.
     * @param {WorldUpdateArgs} args - Arguments to update one World.
     * @example
     * // Update one World
     * const world = await prisma.world.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends WorldUpdateArgs>(args: Prisma.SelectSubset<T, WorldUpdateArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Delete zero or more Worlds.
     * @param {WorldDeleteManyArgs} args - Arguments to filter Worlds to delete.
     * @example
     * // Delete a few Worlds
     * const { count } = await prisma.world.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends WorldDeleteManyArgs>(args?: Prisma.SelectSubset<T, WorldDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more Worlds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorldUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Worlds
     * const world = await prisma.world.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends WorldUpdateManyArgs>(args: Prisma.SelectSubset<T, WorldUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more Worlds and returns the data updated in the database.
     * @param {WorldUpdateManyAndReturnArgs} args - Arguments to update many Worlds.
     * @example
     * // Update many Worlds
     * const world = await prisma.world.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more Worlds and only return the `id`
     * const worldWithIdOnly = await prisma.world.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    updateManyAndReturn<T extends WorldUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, WorldUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    /**
     * Create or update one World.
     * @param {WorldUpsertArgs} args - Arguments to update or create a World.
     * @example
     * // Update or create a World
     * const world = await prisma.world.upsert({
     *   create: {
     *     // ... data to create a World
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the World we want to update
     *   }
     * })
     */
    upsert<T extends WorldUpsertArgs>(args: Prisma.SelectSubset<T, WorldUpsertArgs<ExtArgs>>): Prisma.Prisma__WorldClient<runtime.Types.Result.GetResult<Prisma.$WorldPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Count the number of Worlds.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorldCountArgs} args - Arguments to filter Worlds to count.
     * @example
     * // Count the number of Worlds
     * const count = await prisma.world.count({
     *   where: {
     *     // ... the filter for the Worlds we want to count
     *   }
     * })
    **/
    count<T extends WorldCountArgs>(args?: Prisma.Subset<T, WorldCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], WorldCountAggregateOutputType> : number>;
    /**
     * Allows you to perform aggregations operations on a World.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorldAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WorldAggregateArgs>(args: Prisma.Subset<T, WorldAggregateArgs>): Prisma.PrismaPromise<GetWorldAggregateType<T>>;
    /**
     * Group by World.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WorldGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
    **/
    groupBy<T extends WorldGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: WorldGroupByArgs['orderBy'];
    } : {
        orderBy?: WorldGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, WorldGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWorldGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the World model
     */
    readonly fields: WorldFieldRefs;
}
/**
 * The delegate class that acts as a "Promise-like" for World.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__WorldClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    project<T extends Prisma.ProjectDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.ProjectDefaultArgs<ExtArgs>>): Prisma.Prisma__ProjectClient<runtime.Types.Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
/**
 * Fields of the World model
 */
export interface WorldFieldRefs {
    readonly id: Prisma.FieldRef<"World", 'String'>;
    readonly name: Prisma.FieldRef<"World", 'String'>;
    readonly description: Prisma.FieldRef<"World", 'String'>;
    readonly content: Prisma.FieldRef<"World", 'Json'>;
    readonly projectId: Prisma.FieldRef<"World", 'String'>;
    readonly createdAt: Prisma.FieldRef<"World", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"World", 'DateTime'>;
}
/**
 * World findUnique
 */
export type WorldFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * Filter, which World to fetch.
     */
    where: Prisma.WorldWhereUniqueInput;
};
/**
 * World findUniqueOrThrow
 */
export type WorldFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * Filter, which World to fetch.
     */
    where: Prisma.WorldWhereUniqueInput;
};
/**
 * World findFirst
 */
export type WorldFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * Filter, which World to fetch.
     */
    where?: Prisma.WorldWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Worlds to fetch.
     */
    orderBy?: Prisma.WorldOrderByWithRelationInput | Prisma.WorldOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Worlds.
     */
    cursor?: Prisma.WorldWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Worlds from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Worlds.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Worlds.
     */
    distinct?: Prisma.WorldScalarFieldEnum | Prisma.WorldScalarFieldEnum[];
};
/**
 * World findFirstOrThrow
 */
export type WorldFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * Filter, which World to fetch.
     */
    where?: Prisma.WorldWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Worlds to fetch.
     */
    orderBy?: Prisma.WorldOrderByWithRelationInput | Prisma.WorldOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Worlds.
     */
    cursor?: Prisma.WorldWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Worlds from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Worlds.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Worlds.
     */
    distinct?: Prisma.WorldScalarFieldEnum | Prisma.WorldScalarFieldEnum[];
};
/**
 * World findMany
 */
export type WorldFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * Filter, which Worlds to fetch.
     */
    where?: Prisma.WorldWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Worlds to fetch.
     */
    orderBy?: Prisma.WorldOrderByWithRelationInput | Prisma.WorldOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing Worlds.
     */
    cursor?: Prisma.WorldWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Worlds from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Worlds.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Worlds.
     */
    distinct?: Prisma.WorldScalarFieldEnum | Prisma.WorldScalarFieldEnum[];
};
/**
 * World create
 */
export type WorldCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * The data needed to create a World.
     */
    data: Prisma.XOR<Prisma.WorldCreateInput, Prisma.WorldUncheckedCreateInput>;
};
/**
 * World createMany
 */
export type WorldCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Worlds.
     */
    data: Prisma.WorldCreateManyInput | Prisma.WorldCreateManyInput[];
    skipDuplicates?: boolean;
};
/**
 * World createManyAndReturn
 */
export type WorldCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * The data used to create many Worlds.
     */
    data: Prisma.WorldCreateManyInput | Prisma.WorldCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldIncludeCreateManyAndReturn<ExtArgs> | null;
};
/**
 * World update
 */
export type WorldUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * The data needed to update a World.
     */
    data: Prisma.XOR<Prisma.WorldUpdateInput, Prisma.WorldUncheckedUpdateInput>;
    /**
     * Choose, which World to update.
     */
    where: Prisma.WorldWhereUniqueInput;
};
/**
 * World updateMany
 */
export type WorldUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Worlds.
     */
    data: Prisma.XOR<Prisma.WorldUpdateManyMutationInput, Prisma.WorldUncheckedUpdateManyInput>;
    /**
     * Filter which Worlds to update
     */
    where?: Prisma.WorldWhereInput;
    /**
     * Limit how many Worlds to update.
     */
    limit?: number;
};
/**
 * World updateManyAndReturn
 */
export type WorldUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * The data used to update Worlds.
     */
    data: Prisma.XOR<Prisma.WorldUpdateManyMutationInput, Prisma.WorldUncheckedUpdateManyInput>;
    /**
     * Filter which Worlds to update
     */
    where?: Prisma.WorldWhereInput;
    /**
     * Limit how many Worlds to update.
     */
    limit?: number;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldIncludeUpdateManyAndReturn<ExtArgs> | null;
};
/**
 * World upsert
 */
export type WorldUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * The filter to search for the World to update in case it exists.
     */
    where: Prisma.WorldWhereUniqueInput;
    /**
     * In case the World found by the `where` argument doesn't exist, create a new World with this data.
     */
    create: Prisma.XOR<Prisma.WorldCreateInput, Prisma.WorldUncheckedCreateInput>;
    /**
     * In case the World was found with the provided `where` argument, update it with this data.
     */
    update: Prisma.XOR<Prisma.WorldUpdateInput, Prisma.WorldUncheckedUpdateInput>;
};
/**
 * World delete
 */
export type WorldDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
    /**
     * Filter which World to delete.
     */
    where: Prisma.WorldWhereUniqueInput;
};
/**
 * World deleteMany
 */
export type WorldDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Worlds to delete
     */
    where?: Prisma.WorldWhereInput;
    /**
     * Limit how many Worlds to delete.
     */
    limit?: number;
};
/**
 * World without action
 */
export type WorldDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the World
     */
    select?: Prisma.WorldSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the World
     */
    omit?: Prisma.WorldOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.WorldInclude<ExtArgs> | null;
};
//# sourceMappingURL=World.d.ts.map