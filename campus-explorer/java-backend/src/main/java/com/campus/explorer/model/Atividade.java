package com.campus.explorer.model;

import lombok.Data;

@Data
public class Atividade {
    private String id;
    private String nome;
    private String descricao;
    private String categoria;
    private String local;
    private Double latitude;
    private Double longitude;
    private String tipo; // 'local' | 'atividade'
    private String instagram;
    private String website;
    private String localPaiId;
}
